/**
 * Generate 3D models for all NPCs using Tripo3D text-to-model
 *
 * Run with: npx tsx scripts/generate-npc-models.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load API keys
const CONFIG_PATH = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const TRIPO_API_KEY = config.tripo_api_key;

const MODELS_DIR = path.join(__dirname, '../public/assets/models');

// NPC definitions with prompts
const NPCS = [
  {
    id: 'white_rabbit',
    name: 'White Rabbit',
    prompt: 'low poly 3D character, N64 video game style, White Rabbit from Alice in Wonderland, anthropomorphic rabbit wearing waistcoat and pocket watch, standing upright, simple geometry, bright colors, cute cartoon style'
  },
  {
    id: 'mouse',
    name: 'Mouse',
    prompt: 'low poly 3D character, N64 video game style, small mouse character, cute cartoon mouse, simple geometry, gray fur, standing upright, friendly expression'
  },
  {
    id: 'dodo',
    name: 'Dodo',
    prompt: 'low poly 3D character, N64 video game style, Dodo bird from Alice in Wonderland, large friendly bird, simple geometry, gray and blue feathers, standing pose'
  },
  {
    id: 'lory',
    name: 'Lory',
    prompt: 'low poly 3D character, N64 video game style, Lory parrot bird, colorful tropical bird, simple geometry, red and green feathers, cartoon style'
  },
  {
    id: 'bill_the_lizard',
    name: 'Bill the Lizard',
    prompt: 'low poly 3D character, N64 video game style, Bill the Lizard from Alice in Wonderland, small green lizard character, wearing work clothes, simple geometry, standing upright'
  }
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateModel(npc: typeof NPCS[0]): Promise<void> {
  const outputPath = path.join(MODELS_DIR, `${npc.id}.glb`);

  // Skip if already exists
  if (fs.existsSync(outputPath)) {
    console.log(`✓ ${npc.name} model already exists, skipping...`);
    return;
  }

  console.log(`\nGenerating ${npc.name}...`);
  console.log(`Prompt: ${npc.prompt.slice(0, 60)}...`);

  // Submit task to Tripo3D
  const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'text_to_model',
      prompt: npc.prompt,
      model_version: 'v2.5-20250123'
    })
  });

  if (!response.ok) {
    throw new Error(`Tripo API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Tripo error: ${data.message}`);
  }

  const taskId = data.data.task_id;
  console.log(`Task submitted: ${taskId}`);

  // Poll for completion
  for (let i = 0; i < 90; i++) {
    await sleep(2000);

    const statusRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${TRIPO_API_KEY}` }
    });

    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    const progress = statusData.data?.progress || 0;

    process.stdout.write(`\r  Progress: ${progress}%   `);

    if (status === 'success') {
      console.log('\n  ✓ Model generated!');

      // Get GLB URL
      const output = statusData.data.output;
      const glbUrl = output?.pbr_model || output?.model || output?.base_model;

      if (!glbUrl) {
        throw new Error('No model URL in response');
      }

      // Download GLB
      const glbRes = await fetch(glbUrl);
      if (!glbRes.ok) {
        throw new Error(`Download failed: ${glbRes.status}`);
      }

      const buffer = await glbRes.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));

      const stats = fs.statSync(outputPath);
      console.log(`  Saved: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
      return;
    }

    if (status === 'failed') {
      throw new Error('Model generation failed');
    }
  }

  throw new Error('Timeout waiting for model');
}

async function main() {
  console.log('========================================');
  console.log('  NPC MODEL GENERATOR');
  console.log('  Tripo3D text-to-model');
  console.log('========================================');

  // Ensure output directory
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const npc of NPCS) {
    try {
      await generateModel(npc);
      success++;
    } catch (error) {
      console.error(`\n  ✗ Failed to generate ${npc.name}:`, error);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`  COMPLETE: ${success} succeeded, ${failed} failed`);
  console.log('========================================');
}

main().catch(console.error);
