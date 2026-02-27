/**
 * Generate 3D models for garden environment assets using Tripo3D text-to-model
 *
 * Run with: npx tsx scripts/generate-garden-models.ts
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

const GARDEN_DIR = path.join(__dirname, '../public/assets/models/garden');

// Garden asset definitions with prompts
const ASSETS = [
  // Platforms / Walls
  {
    id: 'hedge_straight',
    name: 'Straight Hedge',
    prompt: 'low poly stylized straight garden hedge wall, trimmed boxwood, rectangular green bush, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'hedge_corner',
    name: 'Corner Hedge',
    prompt: 'low poly stylized L-shaped garden hedge corner piece, trimmed boxwood, green bush wall corner, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'hedge_tjunction',
    name: 'T-Junction Hedge',
    prompt: 'low poly stylized T-shaped garden hedge junction, trimmed boxwood, green bush wall intersection, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'hedge_arch',
    name: 'Hedge Arch',
    prompt: 'low poly stylized garden hedge archway, trimmed green bush passage with curved top, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'stone_path',
    name: 'Stone Path',
    prompt: 'low poly stylized straight cobblestone garden path segment, flat stone walkway, cel-shaded game asset, Breath of the Wild art style, warm tan colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'stone_path_curved',
    name: 'Curved Stone Path',
    prompt: 'low poly stylized curved cobblestone garden path segment, gently curving stone walkway, cel-shaded game asset, Breath of the Wild art style, warm tan colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'grass_platform',
    name: 'Grass Platform',
    prompt: 'low poly stylized grassy floating platform with dirt edges, flat green top, cel-shaded game asset, Breath of the Wild art style, soft green colors, clean topology, game-ready, isolated on white background'
  },

  // Centerpieces
  {
    id: 'fountain',
    name: 'Garden Fountain',
    prompt: 'low poly stylized ornate garden fountain, three tiered white marble water fountain with basin, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'gazebo',
    name: 'Garden Gazebo',
    prompt: 'low poly stylized Victorian garden gazebo, six white pillars with domed wooden roof, hexagonal floor, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'throne',
    name: 'Queen Throne',
    prompt: 'low poly stylized ornate red and gold throne, Queen of Hearts royal seat with heart motifs, tall back, velvet cushion, cel-shaded game asset, Breath of the Wild art style, bright colors, clean topology, game-ready, isolated on white background'
  },

  // Decorations - Rose Bushes
  {
    id: 'rose_bush_red',
    name: 'Red Rose Bush',
    prompt: 'low poly stylized red rose bush garden plant, round green bush with bright red roses, cel-shaded game asset, Breath of the Wild art style, vibrant red and green colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'rose_bush_white',
    name: 'White Rose Bush',
    prompt: 'low poly stylized white rose bush garden plant, round green bush with white roses, cel-shaded game asset, Breath of the Wild art style, soft white and green colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'rose_bush_pink',
    name: 'Pink Rose Bush',
    prompt: 'low poly stylized pink rose bush garden plant, round green bush with pink roses, cel-shaded game asset, Breath of the Wild art style, soft pink and green colors, clean topology, game-ready, isolated on white background'
  },

  // Decorations - Topiaries
  {
    id: 'topiary_sphere',
    name: 'Sphere Topiary',
    prompt: 'low poly stylized garden topiary in sphere shape, trimmed green bush ball on stem in clay pot, cel-shaded game asset, Breath of the Wild art style, soft green colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'topiary_spiral',
    name: 'Spiral Topiary',
    prompt: 'low poly stylized garden topiary in spiral cone shape, trimmed green bush twisted spiral on stem in clay pot, cel-shaded game asset, Breath of the Wild art style, soft green colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'topiary_heart',
    name: 'Heart Topiary',
    prompt: 'low poly stylized garden topiary in heart shape, trimmed green bush heart on stem in clay pot, Queen of Hearts garden, cel-shaded game asset, Breath of the Wild art style, soft green colors, clean topology, game-ready, isolated on white background'
  },

  // Props
  {
    id: 'garden_bench',
    name: 'Garden Bench',
    prompt: 'low poly stylized ornate wrought-iron garden bench, Victorian style with curved armrests, dark metal, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'lantern',
    name: 'Garden Lantern',
    prompt: 'low poly stylized Victorian garden lantern on pole, warm glowing lamp on ornate metal post, cel-shaded game asset, Breath of the Wild art style, gold and black colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'tea_table',
    name: 'Tea Table',
    prompt: 'low poly stylized small round tea party table with white tablecloth, teapot and cups on top, Alice in Wonderland mad tea party, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'chair_ornate',
    name: 'Ornate Chair',
    prompt: 'low poly stylized ornate Victorian garden chair, dark wood with curved back and armrests, cel-shaded game asset, Breath of the Wild art style, brown colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'playing_card',
    name: 'Playing Card',
    prompt: 'low poly stylized giant playing card standing upright, oversized ace of hearts card, flat rectangular, cel-shaded game asset, Breath of the Wild art style, red and white colors, clean topology, game-ready, isolated on white background'
  },

  // Stairs
  {
    id: 'stairs_stone',
    name: 'Stone Stairs',
    prompt: 'low poly stylized short stone staircase, 4-5 cobblestone steps with side walls, garden stairs, cel-shaded game asset, Breath of the Wild art style, warm tan colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'stairs_grass',
    name: 'Grass Stairs',
    prompt: 'low poly stylized grassy stepped hillside, natural earthen steps with grass on top, garden terrain, cel-shaded game asset, Breath of the Wild art style, soft green and brown colors, clean topology, game-ready, isolated on white background'
  },

  // Additional structures
  {
    id: 'pillar_stone',
    name: 'Stone Pillar',
    prompt: 'low poly stylized stone garden pillar column, classical Doric style, white marble, cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready, isolated on white background'
  },
  {
    id: 'gate_ornate',
    name: 'Ornate Gate',
    prompt: 'low poly stylized ornate wrought-iron garden gate, Victorian double gate with heart motif, dark metal with gold accents, cel-shaded game asset, Breath of the Wild art style, clean topology, game-ready, isolated on white background'
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateModel(asset: typeof ASSETS[0]): Promise<void> {
  const outputPath = path.join(GARDEN_DIR, `${asset.id}.glb`);

  // Skip if already exists
  if (fs.existsSync(outputPath)) {
    console.log(`✓ ${asset.name} model already exists, skipping...`);
    return;
  }

  console.log(`\nGenerating ${asset.name}...`);
  console.log(`Prompt: ${asset.prompt.slice(0, 60)}...`);

  // Submit task to Tripo3D
  const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'text_to_model',
      prompt: asset.prompt,
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

  // Poll for completion (max 15 minutes per model)
  for (let i = 0; i < 150; i++) {
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

  throw new Error('Timeout waiting for model (5 min)');
}

async function main() {
  console.log('========================================');
  console.log('  GARDEN ASSET MODEL GENERATOR');
  console.log('  Tripo3D text-to-model');
  console.log('========================================');

  // Ensure output directory
  if (!fs.existsSync(GARDEN_DIR)) {
    fs.mkdirSync(GARDEN_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const asset of ASSETS) {
    try {
      const outputPath = path.join(GARDEN_DIR, `${asset.id}.glb`);
      if (fs.existsSync(outputPath)) {
        skipped++;
        console.log(`✓ ${asset.name} already exists, skipping...`);
        continue;
      }

      await generateModel(asset);
      success++;
    } catch (error) {
      console.error(`\n  ✗ Failed to generate ${asset.name}:`, error);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`  COMPLETE: ${success} generated, ${skipped} skipped, ${failed} failed`);
  console.log('========================================');
}

main().catch(console.error);
