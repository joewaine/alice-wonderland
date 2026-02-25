/**
 * Generate NPC portrait images using ComfyUI Cloud
 *
 * Creates character portrait images in N64/whimsical style
 * for display in the dialogue UI.
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://cloud.comfy.org';

// Load API key from config
const configPath = path.join(process.cwd(), 'config.json');
let API_KEY = '';

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  API_KEY = config.comfy_cloud_api_key;
} catch {
  console.error('Failed to load config.json - make sure it exists with comfy_cloud_api_key');
  process.exit(1);
}

// Portrait style prefix
const PORTRAIT_STYLE = `character portrait, centered face, N64 style low poly 3D render,
whimsical Alice in Wonderland style, simple geometry, bright colors,
fantasy character, video game character select screen, clean background`;

const NEGATIVE_PROMPT = `realistic, photograph, modern, multiple characters,
full body, text, watermark, blurry, complex background`;

// Character portrait prompts
const CHARACTER_PORTRAITS = [
  {
    id: 'white_rabbit',
    name: 'White Rabbit',
    prompt: 'white rabbit character, waistcoat, pocket watch, worried expression, large ears, pink eyes, anthropomorphic rabbit gentleman'
  },
  {
    id: 'mouse',
    name: 'Mouse',
    prompt: 'small mouse character, grey fur, tiny pink nose, round ears, curious expression, cute rodent'
  },
  {
    id: 'dodo',
    name: 'Dodo',
    prompt: 'dodo bird character, extinct bird, rotund body, long beak, pompous expression, feathered'
  },
  {
    id: 'lory',
    name: 'Lory',
    prompt: 'colorful parrot character, red and green feathers, proud expression, tropical bird'
  },
  {
    id: 'bill_the_lizard',
    name: 'Bill the Lizard',
    prompt: 'lizard character, green scales, chimney sweep outfit, nervous expression, reptile with apron'
  },
  {
    id: 'alice',
    name: 'Alice',
    prompt: 'young girl with blonde hair, blue dress with white apron, curious expression, Victorian era child'
  }
];

async function generatePortrait(characterId: string, prompt: string): Promise<string> {
  const fullPrompt = `${PORTRAIT_STYLE}, ${prompt}`;

  // ComfyUI workflow for portrait generation
  const workflow = {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000),
        "steps": 25,
        "cfg": 7.5,
        "sampler_name": "euler_ancestral",
        "scheduler": "normal",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      }
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": "dreamshaper_8.safetensors"
      }
    },
    "5": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": 512,
        "height": 512,
        "batch_size": 1
      }
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": fullPrompt,
        "clip": ["4", 1]
      }
    },
    "7": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": NEGATIVE_PROMPT,
        "clip": ["4", 1]
      }
    },
    "8": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      }
    },
    "9": {
      "class_type": "SaveImage",
      "inputs": {
        "filename_prefix": `portrait_${characterId}`,
        "images": ["8", 0]
      }
    }
  };

  // Submit workflow
  console.log(`Submitting portrait generation for ${characterId}...`);
  const response = await fetch(`${BASE_URL}/api/prompt`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt: workflow })
  });

  if (!response.ok) {
    throw new Error(`ComfyUI API error: ${response.status}`);
  }

  const data = await response.json();
  const promptId = data.prompt_id;
  console.log(`Job submitted, prompt_id: ${promptId}`);

  return await pollForCompletion(promptId);
}

async function pollForCompletion(promptId: string): Promise<string> {
  const maxAttempts = 90;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(2000);

    const statusRes = await fetch(`${BASE_URL}/api/job/${promptId}/status`, {
      headers: { 'X-API-Key': API_KEY }
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    console.log(`  Polling... status: ${statusData.status}`);

    if (statusData.status === 'completed' || statusData.status === 'success') {
      const historyRes = await fetch(`${BASE_URL}/api/history_v2/${promptId}`, {
        headers: { 'X-API-Key': API_KEY }
      });

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const outputs = historyData[promptId]?.outputs || historyData.outputs;

        if (outputs) {
          for (const nodeId in outputs) {
            const nodeOutput = outputs[nodeId];
            if (nodeOutput.images && nodeOutput.images.length > 0) {
              const imageInfo = nodeOutput.images[0];
              const params = new URLSearchParams({
                filename: imageInfo.filename,
                subfolder: imageInfo.subfolder || '',
                type: 'output'
              });

              return `${BASE_URL}/api/view?${params}`;
            }
          }
        }
      }

      throw new Error('No output images found');
    }

    if (statusData.status === 'failed') {
      throw new Error('Generation failed');
    }
  }

  throw new Error('Timeout waiting for image generation');
}

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: { 'X-API-Key': API_KEY },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const outputDir = path.join(process.cwd(), 'public/assets/portraits');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('='.repeat(60));
  console.log('Portrait Generation - Alice in Wonderland');
  console.log('='.repeat(60));

  for (const character of CHARACTER_PORTRAITS) {
    const outputPath = path.join(outputDir, `${character.id}.png`);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`\nSkipping ${character.name} - already exists`);
      continue;
    }

    console.log(`\nGenerating portrait for ${character.name}`);
    console.log(`Prompt: ${character.prompt.substring(0, 50)}...`);

    try {
      const imageUrl = await generatePortrait(character.id, character.prompt);
      console.log(`Downloading portrait...`);
      await downloadImage(imageUrl, outputPath);
      console.log(`Saved to ${outputPath}`);
    } catch (error) {
      console.error(`Failed to generate ${character.name}:`, error);
    }

    // Delay between generations
    await sleep(3000);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Portrait generation complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
