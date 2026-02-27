/**
 * ClaudeParser - Generates level data from chapter text using Claude API
 *
 * Sends Alice in Wonderland chapter text to Claude and receives
 * structured LevelData JSON for building playable levels.
 */

import type { LevelData } from '../data/LevelData';
import { validateLevelData } from '../data/LevelData';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const LEVEL_GENERATION_PROMPT = `You are a game level designer for a 3D platformer collectathon game set in Alice in Wonderland.

Given a chapter from the book, output a JSON LevelData object that describes a playable level. The level should capture the mood and key moments from the chapter.

Output ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "<string>",
  "setting": "<brief description of the environment>",
  "atmosphere": {
    "sky_color": "<hex color like #87CEEB>",
    "fog_color": "<hex color>",
    "fog_near": <number 10-50>,
    "fog_far": <number 50-200>,
    "ambient_light": "<hex color>"
  },
  "platforms": [
    {
      "position": {"x": <num>, "y": <num>, "z": <num>},
      "size": {"x": <width>, "y": <height>, "z": <depth>},
      "type": "solid" or "bouncy",
      "color": "<hex color>",
      "requires_size": "small" or "normal" or "large" (optional)
    }
  ],
  "collectibles": [
    {
      "type": "key" or "star" or "card",
      "position": {"x": <num>, "y": <num>, "z": <num>},
      "card_suit": "hearts"/"diamonds"/"clubs"/"spades" (if type is card),
      "card_value": <1-13> (if type is card)
    }
  ],
  "npcs": [
    {
      "name": "<character name from the chapter>",
      "position": {"x": <num>, "y": <num>, "z": <num>},
      "dialogue": ["<line 1>", "<line 2>", ...]
    }
  ],
  "spawn_point": {"x": 0, "y": 2, "z": 0},
  "gate_position": {"x": <num>, "y": <num>, "z": <num>},
  "size_puzzles": [
    {
      "area_bounds": {
        "min": {"x": <num>, "y": <num>, "z": <num>},
        "max": {"x": <num>, "y": <num>, "z": <num>}
      },
      "required_size": "small" or "large",
      "hint": "<hint text>"
    }
  ]
}

Requirements:
- Include exactly 1 Golden Key (type: "key")
- Include exactly 3 Wonder Stars (type: "star")
- Include exactly 5 Playing Cards (type: "card", varied suits)
- Include at least 1 NPC from the chapter with dialogue from/inspired by the book
- Include at least 1 size_puzzle (requiring Alice to shrink or grow)
- Create 8-15 platforms forming a path from spawn to gate
- Platform positions should create interesting jumps and exploration
- Use heights between 0-20 for platforms
- Spread collectibles throughout the level
- Gate position should be at the far end of the level`;

export class ClaudeParser {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate level data from chapter text
   */
  async generateLevelData(chapterText: string, chapterNumber: number): Promise<LevelData> {
    console.log(`Generating level data for chapter ${chapterNumber}...`);

    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `${LEVEL_GENERATION_PROMPT}\n\n---\n\nCHAPTER TEXT:\n${chapterText}`
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text;

      if (!content) {
        throw new Error('No content in Claude response');
      }

      // Parse JSON (strip markdown if present)
      const levelData = this.parseJsonResponse(content);

      // Validate structure
      if (!validateLevelData(levelData)) {
        throw new Error('Invalid level data structure');
      }

      console.log(`Generated level: "${levelData.title}"`);
      return levelData;

    } catch (error) {
      console.error('Failed to generate level data:', error);
      throw error;
    }
  }

  /**
   * Parse JSON from Claude response, handling markdown wrapping
   */
  private parseJsonResponse(content: string): LevelData {
    let jsonStr = content.trim();

    // Strip markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }

    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }

    jsonStr = jsonStr.trim();

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse JSON:', jsonStr.slice(0, 200));
      throw new Error(`Invalid JSON in response: ${error}`);
    }
  }
}

/**
 * Load a fallback level from pre-generated JSON
 */
export async function loadFallbackLevel(chapterNumber: number): Promise<LevelData> {
  const path = `${import.meta.env.BASE_URL}assets/fallback/chapter_${chapterNumber}.json`;

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load fallback: ${response.status}`);
    }

    const data = await response.json();
    if (!validateLevelData(data)) {
      throw new Error('Invalid fallback level data');
    }

    return data;
  } catch (error) {
    console.error(`Failed to load fallback for chapter ${chapterNumber}:`, error);
    throw error;
  }
}
