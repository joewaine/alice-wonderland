/**
 * Generate Level JSONs Only
 *
 * Generates level data for all chapters without 3D assets.
 * Run with: npx tsx scripts/generate-levels-only.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load API key
const CONFIG_PATH = '/Users/josephwaine/fractal/dantes-inferno-game/config.json';
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const ANTHROPIC_API_KEY = config.anthropic_api_key;

// Output directory
const FALLBACK_DIR = path.join(__dirname, '../public/assets/fallback');

// Gutenberg URL
const GUTENBERG_URL = 'https://www.gutenberg.org/cache/epub/11/pg11.txt';

interface Chapter {
  number: number;
  title: string;
  content: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

async function fetchChapters(): Promise<Chapter[]> {
  console.log('Fetching from Gutenberg...');
  const response = await fetch(GUTENBERG_URL);
  const text = await response.text();

  const contentStart = text.indexOf('CHAPTER I');
  const endMarker = '*** END OF THE PROJECT GUTENBERG';
  let contentEnd = text.indexOf(endMarker);
  if (contentEnd === -1) contentEnd = text.length;

  const content = text.slice(contentStart, contentEnd);

  const chapterPattern = /CHAPTER ([IVXLC]+)\.?\s*\r?\n+([^\r\n]+)/g;
  const matches: { index: number; number: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = chapterPattern.exec(content)) !== null) {
    matches.push({ index: match.index, number: match[1], title: match[2].trim() });
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

const LEVEL_PROMPT = `You are a game level designer for a 3D platformer set in Alice in Wonderland.
Output ONLY valid JSON (no markdown) with this structure:
{
  "chapter_number": <number>,
  "chapter_title": "<string>",
  "setting": "<description>",
  "atmosphere": {"sky_color": "#hex", "fog_color": "#hex", "fog_near": 20, "fog_far": 100, "ambient_light": "#hex"},
  "platforms": [{"position": {"x": 0, "y": 0, "z": 0}, "size": {"x": 5, "y": 1, "z": 5}, "type": "solid", "color": "#hex"}],
  "collectibles": [{"type": "key", "position": {"x": 0, "y": 1, "z": 0}}],
  "npcs": [{"name": "Character", "position": {"x": 0, "y": 0, "z": 0}, "dialogue": ["line1", "line2"]}],
  "spawn_point": {"x": 0, "y": 2, "z": 0},
  "gate_position": {"x": 0, "y": 0, "z": -50},
  "size_puzzles": [{"area_bounds": {"min": {"x": -5, "y": 0, "z": -5}, "max": {"x": 5, "y": 5, "z": 5}}, "required_size": "small", "hint": "hint text"}]
}
Include: 1 key, 3 stars, 5 cards, 1+ NPC with dialogue, 1+ size puzzle, 8-15 platforms.`;

async function generateLevel(chapter: Chapter): Promise<object> {
  console.log(`Generating level for Chapter ${chapter.number}: ${chapter.title}`);

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
      messages: [{ role: 'user', content: `${LEVEL_PROMPT}\n\nCHAPTER:\n${chapter.content}` }]
    })
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  let content = data.content[0]?.text || '';

  // Strip markdown
  if (content.startsWith('```json')) content = content.slice(7);
  else if (content.startsWith('```')) content = content.slice(3);
  if (content.endsWith('```')) content = content.slice(0, -3);

  return JSON.parse(content.trim());
}

async function main() {
  console.log('=== Level JSON Generator ===\n');
  ensureDir(FALLBACK_DIR);

  const chapters = await fetchChapters();

  // Generate for chapters 1-4
  for (let i = 0; i < Math.min(4, chapters.length); i++) {
    const chapter = chapters[i];
    const levelPath = path.join(FALLBACK_DIR, `chapter_${chapter.number}.json`);

    if (fs.existsSync(levelPath)) {
      console.log(`Chapter ${chapter.number} exists, skipping`);
      continue;
    }

    try {
      const levelData = await generateLevel(chapter);
      fs.writeFileSync(levelPath, JSON.stringify(levelData, null, 2));
      console.log(`Saved: ${levelPath}\n`);
    } catch (error) {
      console.error(`Failed chapter ${chapter.number}:`, error);
    }
  }

  console.log('\n=== Done! ===');
  console.log('Level JSONs:', fs.readdirSync(FALLBACK_DIR));
}

main().catch(console.error);
