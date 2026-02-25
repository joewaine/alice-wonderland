/**
 * Generate skybox images for each chapter using ComfyUI Cloud
 *
 * Creates equirectangular panoramic skybox images based on
 * each chapter's atmosphere and setting.
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

// Skybox style prefix for consistent look
const SKYBOX_STYLE = `equirectangular panorama, 360 degree hdri skybox, seamless,
fantastical whimsical dreamscape, Alice in Wonderland style, magical atmosphere,
pastel colors, no figures, no text, environmental only`;

const NEGATIVE_PROMPT = `realistic, photograph, modern, text, watermark,
people, figures, animals, characters, seams, artifacts`;

// Chapter-specific prompts
const CHAPTER_SKYBOXES = [
  {
    chapter: 1,
    name: 'Down the Rabbit-Hole',
    prompt: 'falling through endless tunnel, floating objects, pocket watches, keys,
playing cards, swirling purple and gold colors, magical vortex, dreamy'
  },
  {
    chapter: 2,
    name: 'The Pool of Tears',
    prompt: 'vast sea of tears, floating islands, giant mushrooms in distance,
stormy purple sky, crying clouds, melancholy but magical, oceanic dreamscape'
  },
  {
    chapter: 3,
    name: 'A Caucus-Race and a Long Tale',
    prompt: 'whimsical beach at sunset, strange creatures silhouettes,
golden hour lighting, carnival atmosphere, playful clouds, sandy shores'
  },
  {
    chapter: 4,
    name: 'The Rabbit Sends in a Little Bill',
    prompt: 'cozy cottage interior becoming outdoor garden, chimney smoke,
cucumber frames, broken glass sparkling, warm afternoon, domestic wonderland'
  }
];

async function generateSkybox(chapterNum: number, prompt: string): Promise<string> {
  const fullPrompt = `${SKYBOX_STYLE}, ${prompt}`;

  // ComfyUI workflow for panoramic generation
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
        "width": 1024,  // Wide for panoramic
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
        "filename_prefix": `skybox_chapter_${chapterNum}`,
        "images": ["8", 0]
      }
    }
  };

  // Submit workflow
  console.log(`Submitting skybox generation for Chapter ${chapterNum}...`);
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

  // Poll for completion
  return await pollForCompletion(promptId);
}

async function pollForCompletion(promptId: string): Promise<string> {
  const maxAttempts = 90; // 3 minutes max

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(2000);

    const statusRes = await fetch(`${BASE_URL}/api/job/${promptId}/status`, {
      headers: { 'X-API-Key': API_KEY }
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    console.log(`  Polling... status: ${statusData.status}`);

    if (statusData.status === 'completed' || statusData.status === 'success') {
      // Get image from history
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
      throw new Error(`Generation failed`);
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
  const outputDir = path.join(process.cwd(), 'public/assets/skyboxes');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('='.repeat(60));
  console.log('Skybox Generation - Alice in Wonderland');
  console.log('='.repeat(60));

  for (const chapter of CHAPTER_SKYBOXES) {
    const outputPath = path.join(outputDir, `chapter_${chapter.chapter}.png`);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`\nSkipping Chapter ${chapter.chapter} - already exists`);
      continue;
    }

    console.log(`\nGenerating skybox for Chapter ${chapter.chapter}: ${chapter.name}`);
    console.log(`Prompt: ${chapter.prompt.substring(0, 60)}...`);

    try {
      const imageUrl = await generateSkybox(chapter.chapter, chapter.prompt);
      console.log(`Downloading skybox...`);
      await downloadImage(imageUrl, outputPath);
      console.log(`Saved to ${outputPath}`);
    } catch (error) {
      console.error(`Failed to generate Chapter ${chapter.chapter}:`, error);
    }

    // Delay between generations to avoid rate limiting
    await sleep(3000);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Skybox generation complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
