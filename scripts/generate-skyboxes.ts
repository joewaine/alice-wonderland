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

// Enhanced skybox style - pure sky only, no objects or figures
const SKYBOX_STYLE = `equirectangular sky panorama, 360 degree seamless sky environment, ONLY clouds and sky, pure atmospheric sky gradient, fantasy sky illustration, painterly volumetric clouds, soft ethereal glow, magical ambient lighting, endless sky above clouds, masterpiece quality, highly detailed`;

const NEGATIVE_PROMPT = `ground, horizon, landscape, terrain, mountains, trees, buildings, structures, objects, spheres, people, figures, faces, bodies, characters, silhouettes, text, watermark, split image, seam, distorted, low quality, blurry, jpeg artifacts`;

// Chapter-specific prompts - pure sky scenes, no ground or objects
const CHAPTER_SKYBOXES = [
  {
    chapter: 1,
    name: 'Down the Rabbit-Hole',
    prompt: 'deep purple twilight sky gradient fading to cosmic black above, swirling violet nebula clouds, scattered stars, aurora wisps, dreamlike sky only, no ground no objects'
  },
  {
    chapter: 2,
    name: 'The Pool of Tears',
    prompt: 'dramatic grey storm clouds filling the sky, silver-grey cloudscape, moody blue grey sky gradient, silver linings, emotional overcast sky only, no ground no objects'
  },
  {
    chapter: 3,
    name: 'A Caucus-Race and a Long Tale',
    prompt: 'warm sunset sky gradient with orange pink and gold clouds, golden hour sky, cotton candy clouds, soft peachy sky gradient, sky only, no ground no objects no figures'
  },
  {
    chapter: 4,
    name: 'The Rabbit Sends in a Little Bill',
    prompt: 'bright blue afternoon sky with fluffy white cumulus clouds, soft light blue gradient, peaceful sunny sky, scattered clouds, sky only, no ground no objects'
  }
];

async function generateSkybox(chapterNum: number, prompt: string): Promise<string> {
  const fullPrompt = `${SKYBOX_STYLE}, ${prompt}`;

  // ComfyUI workflow for high-quality panoramic generation
  const workflow = {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000),
        "steps": 40,
        "cfg": 7,
        "sampler_name": "dpmpp_2m_sde",
        "scheduler": "karras",
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
        "width": 2048,  // High-res equirectangular (2:1 ratio)
        "height": 1024,
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
