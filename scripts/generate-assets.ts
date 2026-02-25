/**
 * Batch Asset Generator
 *
 * Generates all assets for Alice in Wonderland chapters:
 * 1. Level JSON via Claude API
 * 2. Character images via ComfyUI Cloud
 * 3. 3D models via Tripo3D
 *
 * Run with: npx tsx scripts/generate-assets.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load API keys from config
const CONFIG_PATH = '/Users/josephwaine/fractal/dantes-inferno-game/config.json';
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

const ANTHROPIC_API_KEY = config.anthropic_api_key;
const COMFY_API_KEY = config.comfy_cloud_api_key;
const TRIPO_API_KEY = config.tripo_api_key;

// Output directories
const PUBLIC_DIR = path.join(__dirname, '../public/assets');
const FALLBACK_DIR = path.join(PUBLIC_DIR, 'fallback');
const MODELS_DIR = path.join(PUBLIC_DIR, 'models');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// Gutenberg URL for Alice in Wonderland
const GUTENBERG_URL = 'https://www.gutenberg.org/cache/epub/11/pg11.txt';

// N64-style prompts
const N64_STYLE_PREFIX = `low poly 3D render, N64 style, chunky vertices, simple geometry,
bright saturated colors, clean white background, no realistic textures,
video game asset, Banjo-Kazooie style`;

const NEGATIVE_PROMPT = `realistic, high poly, detailed textures, photorealistic,
complex lighting, shadows, blurry, watermark, text`;

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// ============================================
// GUTENBERG FETCHER
// ============================================

interface Chapter {
  number: number;
  title: string;
  content: string;
}

async function fetchAndParseChapters(): Promise<Chapter[]> {
  console.log('\n=== Fetching Alice in Wonderland from Project Gutenberg ===');

  const response = await fetch(GUTENBERG_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const text = await response.text();
  console.log(`Fetched ${text.length} characters`);

  // Find content boundaries
  const contentStart = text.indexOf('CHAPTER I');
  const endMarker = '*** END OF THE PROJECT GUTENBERG';
  let contentEnd = text.indexOf(endMarker);
  if (contentEnd === -1) contentEnd = text.length;

  const content = text.slice(contentStart, contentEnd);

  // Parse chapters
  const chapterPattern = /CHAPTER ([IVXLC]+)\.?\s*\r?\n+([^\r\n]+)/g;
  const matches: { index: number; number: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = chapterPattern.exec(content)) !== null) {
    matches.push({
      index: match.index,
      number: match[1],
      title: match[2].trim()
    });
  }

  const chapters: Chapter[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : content.length;

    chapters.push({
      number: romanToNumber(matches[i].number),
      title: matches[i].title,
      content: content.slice(start, end).trim()
    });
  }

  console.log(`Parsed ${chapters.length} chapters`);
  return chapters;
}

function romanToNumber(roman: string): number {
  const values: Record<string, number> = { 'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100 };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = values[roman[i]] || 0;
    const next = values[roman[i + 1]] || 0;
    result += current < next ? -current : current;
  }
  return result;
}

// ============================================
// CLAUDE LEVEL GENERATOR
// ============================================

const LEVEL_PROMPT = `You are a game level designer for a 3D platformer collectathon game set in Alice in Wonderland.

Given a chapter from the book, output a JSON LevelData object that describes a playable level. The level should capture the mood and key moments from the chapter.

Output ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "chapter_number": <number>,
  "chapter_title": "<string>",
  "setting": "<brief description>",
  "atmosphere": {
    "sky_color": "<hex color like #87CEEB>",
    "fog_color": "<hex color>",
    "fog_near": <number 10-50>,
    "fog_far": <number 50-200>,
    "ambient_light": "<hex color>"
  },
  "platforms": [
    {"position": {"x": <num>, "y": <num>, "z": <num>}, "size": {"x": <w>, "y": <h>, "z": <d>}, "type": "solid", "color": "<hex>"}
  ],
  "collectibles": [
    {"type": "key", "position": {"x": <num>, "y": <num>, "z": <num>}},
    {"type": "star", "position": {"x": <num>, "y": <num>, "z": <num>}},
    {"type": "card", "position": {"x": <num>, "y": <num>, "z": <num>}, "card_suit": "hearts", "card_value": 1}
  ],
  "npcs": [
    {"name": "<character>", "position": {"x": <num>, "y": <num>, "z": <num>}, "dialogue": ["<line>", "<line>"]}
  ],
  "spawn_point": {"x": 0, "y": 2, "z": 0},
  "gate_position": {"x": <num>, "y": <num>, "z": <num>},
  "size_puzzles": [
    {"area_bounds": {"min": {"x": <n>, "y": <n>, "z": <n>}, "max": {"x": <n>, "y": <n>, "z": <n>}}, "required_size": "small", "hint": "<text>"}
  ]
}

Include: 1 key, 3 stars, 5 cards, 1+ NPC, 1+ size puzzle, 8-15 platforms forming a path.`;

async function generateLevelData(chapter: Chapter): Promise<object> {
  console.log(`\nGenerating level data for Chapter ${chapter.number}: ${chapter.title}`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `${LEVEL_PROMPT}\n\n---\n\nCHAPTER TEXT:\n${chapter.content}`
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let content = data.content[0]?.text || '';

  // Strip markdown
  if (content.startsWith('```json')) content = content.slice(7);
  else if (content.startsWith('```')) content = content.slice(3);
  if (content.endsWith('```')) content = content.slice(0, -3);

  return JSON.parse(content.trim());
}

// ============================================
// COMFYUI IMAGE GENERATOR
// ============================================

async function generateCharacterImage(characterName: string, description: string): Promise<string> {
  console.log(`\nGenerating image for: ${characterName}`);

  const prompt = `${N64_STYLE_PREFIX}, ${description}, ${characterName} from Alice in Wonderland, character portrait, front view`;

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
    "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "dreamshaper_8.safetensors" } },
    "5": { "class_type": "EmptyLatentImage", "inputs": { "width": 512, "height": 512, "batch_size": 1 } },
    "6": { "class_type": "CLIPTextEncode", "inputs": { "text": prompt, "clip": ["4", 1] } },
    "7": { "class_type": "CLIPTextEncode", "inputs": { "text": NEGATIVE_PROMPT, "clip": ["4", 1] } },
    "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
    "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": characterName.replace(/\s+/g, '_'), "images": ["8", 0] } }
  };

  const response = await fetch('https://cloud.comfy.org/api/prompt', {
    method: 'POST',
    headers: { 'X-API-Key': COMFY_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow })
  });

  if (!response.ok) throw new Error(`ComfyUI error: ${response.status}`);

  const data = await response.json();
  const promptId = data.prompt_id;

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const statusRes = await fetch(`https://cloud.comfy.org/api/job/${promptId}/status`, {
      headers: { 'X-API-Key': COMFY_API_KEY }
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    if (statusData.status === 'completed' || statusData.status === 'success') {
      if (statusData.outputs) {
        for (const nodeId in statusData.outputs) {
          const nodeOutput = statusData.outputs[nodeId];
          if (nodeOutput.images?.[0]) {
            const imageInfo = nodeOutput.images[0];
            const params = new URLSearchParams({
              filename: imageInfo.filename,
              subfolder: imageInfo.subfolder || '',
              type: 'output'
            });
            const viewRes = await fetch(`https://cloud.comfy.org/api/view?${params}`, {
              headers: { 'X-API-Key': COMFY_API_KEY },
              redirect: 'follow'
            });
            return viewRes.url;
          }
        }
      }
    }

    if (statusData.status === 'failed') throw new Error('ComfyUI generation failed');
  }

  throw new Error('ComfyUI timeout');
}

// ============================================
// TRIPO3D MODEL GENERATOR
// ============================================

async function generateModel(imageUrl: string): Promise<string> {
  console.log('Converting image to 3D model...');

  const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: 'url', url: imageUrl },
      model_version: 'v2.5-20250123'
    })
  });

  if (!response.ok) throw new Error(`Tripo error: ${response.status}`);

  const data = await response.json();
  if (data.code !== 0) throw new Error(`Tripo error: ${data.message}`);

  const taskId = data.data.task_id;

  // Poll for completion
  for (let i = 0; i < 90; i++) {
    await sleep(2000);

    const statusRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${TRIPO_API_KEY}` }
    });

    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === 'success') {
      const output = statusData.data.output;
      return output?.model || output?.pbr_model || output?.base_model;
    }

    if (status === 'failed') throw new Error('Tripo3D conversion failed');

    console.log(`  Progress: ${statusData.data?.progress || 0}%`);
  }

  throw new Error('Tripo3D timeout');
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  const stats = fs.statSync(outputPath);
  console.log(`  Saved: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

// ============================================
// MAIN GENERATOR
// ============================================

async function generateChapterAssets(chapter: Chapter): Promise<void> {
  const chapterNum = chapter.number;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`CHAPTER ${chapterNum}: ${chapter.title}`);
  console.log('='.repeat(50));

  // Check if already generated
  const levelPath = path.join(FALLBACK_DIR, `chapter_${chapterNum}.json`);
  if (fs.existsSync(levelPath)) {
    console.log(`Level data already exists, skipping...`);
    return;
  }

  // Generate level data
  const levelData = await generateLevelData(chapter);
  fs.writeFileSync(levelPath, JSON.stringify(levelData, null, 2));
  console.log(`Saved level data: ${levelPath}`);

  // Extract NPC names for character generation
  const npcs = (levelData as any).npcs || [];
  for (const npc of npcs) {
    const modelPath = path.join(MODELS_DIR, `${npc.name.replace(/\s+/g, '_').toLowerCase()}.glb`);

    if (fs.existsSync(modelPath)) {
      console.log(`Model for ${npc.name} already exists, skipping...`);
      continue;
    }

    try {
      // Generate character image
      const imageUrl = await generateCharacterImage(npc.name, 'fantasy character');

      // Save image
      const imagePath = path.join(IMAGES_DIR, `${npc.name.replace(/\s+/g, '_').toLowerCase()}.png`);
      await downloadFile(imageUrl, imagePath);

      // Generate 3D model
      const glbUrl = await generateModel(imageUrl);
      await downloadFile(glbUrl, modelPath);

    } catch (error) {
      console.error(`Failed to generate assets for ${npc.name}:`, error);
    }
  }
}

async function main() {
  console.log('========================================');
  console.log('  ALICE IN WONDERLAND ASSET GENERATOR');
  console.log('========================================');

  // Ensure output directories exist
  ensureDir(FALLBACK_DIR);
  ensureDir(MODELS_DIR);
  ensureDir(IMAGES_DIR);

  // Fetch and parse chapters
  const chapters = await fetchAndParseChapters();

  // Generate assets for chapters 1-4 (demo scope)
  for (let i = 0; i < Math.min(4, chapters.length); i++) {
    await generateChapterAssets(chapters[i]);
  }

  console.log('\n========================================');
  console.log('  ASSET GENERATION COMPLETE!');
  console.log('========================================');
  console.log(`\nGenerated assets in: ${PUBLIC_DIR}`);
}

main().catch(error => {
  console.error('\nAsset generation failed:', error);
  process.exit(1);
});
