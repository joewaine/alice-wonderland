/**
 * Asset Pipeline Spike
 *
 * Tests the ComfyUI Cloud → Tripo3D → GLB workflow before building the game.
 * Run with: npx tsx scripts/spike-asset-pipeline.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load API keys from config
const CONFIG_PATH = '/Users/josephwaine/fractal/dantes-inferno-game/config.json';
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

const COMFY_API_KEY = config.comfy_cloud_api_key;
const TRIPO_API_KEY = config.tripo_api_key;

// N64-style prompt for test character
const N64_PROMPT = `low poly 3D render, N64 style, chunky vertices, simple geometry,
bright saturated colors, clean white background, no realistic textures,
video game asset, Banjo-Kazooie style, Alice in Wonderland character,
young girl with blue dress, blonde hair, standing pose, front view`;

const NEGATIVE_PROMPT = `realistic, high poly, detailed textures, photorealistic,
complex lighting, shadows, blurry, watermark, text`;

// Helper: sleep for polling
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Step 1: Generate image via ComfyUI Cloud
async function generateImageComfyUI(): Promise<string> {
  console.log('\n=== Step 1: Generating image via ComfyUI Cloud ===');
  console.log('Prompt:', N64_PROMPT.slice(0, 80) + '...');

  // ComfyUI Cloud workflow in API format
  // This is a minimal txt2img workflow
  const workflow = {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000),
        "steps": 20,
        "cfg": 7,
        "sampler_name": "euler",
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
        "text": N64_PROMPT,
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
        "filename_prefix": "alice_test",
        "images": ["8", 0]
      }
    }
  };

  const BASE_URL = 'https://cloud.comfy.org';

  try {
    // Submit workflow
    console.log('Submitting workflow to ComfyUI Cloud...');
    const response = await fetch(`${BASE_URL}/api/prompt`, {
      method: 'POST',
      headers: {
        'X-API-Key': COMFY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers));
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const promptId = data.prompt_id;
    console.log('Job submitted, prompt_id:', promptId);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (attempts < maxAttempts) {
      await sleep(2000);
      attempts++;

      const statusRes = await fetch(`${BASE_URL}/api/job/${promptId}/status`, {
        headers: {
          'X-API-Key': COMFY_API_KEY
        }
      });

      if (!statusRes.ok) {
        console.log(`Polling error: ${statusRes.status}`);
        continue;
      }

      const statusData = await statusRes.json();
      console.log(`Polling... status: ${statusData.status} (attempt ${attempts})`);

      if (statusData.status === 'completed' || statusData.status === 'success') {
        // Log the full status response to understand structure
        console.log('Job completed, checking outputs...');
        console.log('Status data:', JSON.stringify(statusData, null, 2).slice(0, 500));

        // Try to get outputs directly from status response
        if (statusData.outputs) {
          for (const nodeId in statusData.outputs) {
            const nodeOutput = statusData.outputs[nodeId];
            if (nodeOutput.images && nodeOutput.images.length > 0) {
              const imageInfo = nodeOutput.images[0];
              console.log('Found image:', imageInfo);

              // Build the view URL
              const params = new URLSearchParams({
                filename: imageInfo.filename,
                subfolder: imageInfo.subfolder || '',
                type: 'output'
              });

              const viewRes = await fetch(`${BASE_URL}/api/view?${params}`, {
                headers: { 'X-API-Key': COMFY_API_KEY },
                redirect: 'follow'
              });

              const imageUrl = viewRes.url;
              console.log('Image generated successfully!');
              console.log('Image URL:', imageUrl);
              return imageUrl;
            }
          }
        }

        // Try history endpoint as fallback
        console.log('Trying history endpoint...');
        const historyRes = await fetch(`${BASE_URL}/api/history_v2/${promptId}`, {
          headers: { 'X-API-Key': COMFY_API_KEY }
        });

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          console.log('History data:', JSON.stringify(historyData, null, 2).slice(0, 500));

          if (historyData.outputs) {
            for (const nodeId in historyData.outputs) {
              const nodeOutput = historyData.outputs[nodeId];
              if (nodeOutput.images && nodeOutput.images.length > 0) {
                const imageInfo = nodeOutput.images[0];
                const params = new URLSearchParams({
                  filename: imageInfo.filename,
                  subfolder: imageInfo.subfolder || '',
                  type: 'output'
                });

                const viewRes = await fetch(`${BASE_URL}/api/view?${params}`, {
                  headers: { 'X-API-Key': COMFY_API_KEY },
                  redirect: 'follow'
                });

                return viewRes.url;
              }
            }
          }
        }

        throw new Error('No output images found in response');
      }

      if (statusData.status === 'failed') {
        throw new Error(`Generation failed: ${JSON.stringify(statusData)}`);
      }
    }

    throw new Error('Timeout waiting for image generation');

  } catch (error) {
    console.error('ComfyUI generation failed:', error);
    throw error;
  }
}

// Step 2: Convert image to 3D via Tripo3D
async function convertToGLB(imageUrl: string): Promise<string> {
  console.log('\n=== Step 2: Converting image to 3D via Tripo3D ===');
  console.log('Input image:', imageUrl);

  try {
    // Submit image-to-model task
    const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRIPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'image_to_model',
        file: {
          type: 'url',
          url: imageUrl
        },
        model_version: 'v2.5-20250123'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tripo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Tripo API error: ${data.message}`);
    }

    const taskId = data.data.task_id;
    console.log('Task submitted, task_id:', taskId);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 90; // 3 minutes max (3D generation is slow)

    while (attempts < maxAttempts) {
      await sleep(2000);
      attempts++;

      const statusRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${TRIPO_API_KEY}`
        }
      });

      const statusData = await statusRes.json();
      const status = statusData.data?.status;
      const progress = statusData.data?.progress || 0;

      console.log(`Polling... status: ${status}, progress: ${progress}% (attempt ${attempts})`);

      if (status === 'success') {
        const output = statusData.data.output;
        const glbUrl = output?.model;

        if (glbUrl) {
          console.log('3D model generated successfully!');
          console.log('GLB URL:', glbUrl);
          return glbUrl;
        }
        throw new Error('No GLB URL in response');
      }

      if (status === 'failed') {
        throw new Error(`3D conversion failed: ${JSON.stringify(statusData)}`);
      }
    }

    throw new Error('Timeout waiting for 3D conversion');

  } catch (error) {
    console.error('Tripo3D conversion failed:', error);
    throw error;
  }
}

// Step 3: Download GLB file
async function downloadGLB(glbUrl: string): Promise<string> {
  console.log('\n=== Step 3: Downloading GLB file ===');

  const outputPath = path.join(__dirname, '../public/assets/models/spike_test_alice.glb');

  const response = await fetch(glbUrl);
  if (!response.ok) {
    throw new Error(`Failed to download GLB: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  const stats = fs.statSync(outputPath);
  console.log(`GLB saved to: ${outputPath}`);
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);

  return outputPath;
}

// Alternative: Skip ComfyUI and test Tripo3D directly with text-to-3D
async function testTripoDirectly(): Promise<string> {
  console.log('\n=== Alternative: Testing Tripo3D text-to-3D directly ===');
  console.log('This bypasses ComfyUI to verify Tripo3D works independently.');

  const prompt = `low poly 3D character, N64 video game style, Alice in Wonderland,
young girl with blue dress and white apron, blonde hair with black headband,
simple geometry, bright saturated colors, cute cartoon style, standing pose`;

  try {
    const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRIPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'text_to_model',
        prompt: prompt,
        model_version: 'v2.5-20250123'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tripo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Tripo API error: ${data.message}`);
    }

    const taskId = data.data.task_id;
    console.log('Task submitted, task_id:', taskId);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 90;

    while (attempts < maxAttempts) {
      await sleep(2000);
      attempts++;

      const statusRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${TRIPO_API_KEY}`
        }
      });

      const statusData = await statusRes.json();
      const status = statusData.data?.status;
      const progress = statusData.data?.progress || 0;

      console.log(`Polling... status: ${status}, progress: ${progress}% (attempt ${attempts})`);

      if (status === 'success') {
        console.log('Tripo task completed!');
        console.log('Response data:', JSON.stringify(statusData.data, null, 2).slice(0, 1000));

        const output = statusData.data.output;

        // Try different possible output formats
        const glbUrl = output?.model || output?.pbr_model || output?.base_model;

        if (glbUrl) {
          console.log('3D model generated successfully!');
          return glbUrl;
        }

        // Log the full output to see what we have
        console.log('Full output structure:', JSON.stringify(output, null, 2));
        throw new Error('No GLB URL found in response. See output structure above.');
      }

      if (status === 'failed') {
        throw new Error(`3D generation failed: ${JSON.stringify(statusData)}`);
      }
    }

    throw new Error('Timeout waiting for 3D generation');

  } catch (error) {
    console.error('Tripo3D text-to-model failed:', error);
    throw error;
  }
}

// Main spike test
async function runSpike() {
  console.log('========================================');
  console.log('  ASSET PIPELINE SPIKE TEST');
  console.log('  ComfyUI Cloud → Tripo3D → GLB');
  console.log('========================================');

  let glbUrl: string;

  try {
    // Try the full pipeline first
    const imageUrl = await generateImageComfyUI();
    glbUrl = await convertToGLB(imageUrl);
  } catch (error) {
    console.log('\n--- ComfyUI pipeline failed, trying Tripo3D directly ---');
    console.log('This tests if Tripo3D works at all.\n');

    // Fall back to text-to-3D
    glbUrl = await testTripoDirectly();
  }

  // Download the GLB
  const localPath = await downloadGLB(glbUrl);

  console.log('\n========================================');
  console.log('  SPIKE COMPLETE!');
  console.log('========================================');
  console.log('\nNext steps:');
  console.log('1. Run: npm run dev');
  console.log('2. The GLB will be loaded into a Three.js scene');
  console.log('3. Evaluate: Does it look N64-style? Is polycount 300-800?');
  console.log('\nGLB file:', localPath);
}

runSpike().catch((error) => {
  console.error('\n========================================');
  console.error('  SPIKE FAILED');
  console.error('========================================');
  console.error(error);
  process.exit(1);
});
