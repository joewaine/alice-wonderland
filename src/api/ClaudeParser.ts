/**
 * Level data loading utilities
 *
 * Loads pre-generated level data from JSON files.
 * (ClaudeParser class removed - API keys must not be in client-side code)
 */

import type { LevelData } from '../data/LevelData';
import { validateLevelData } from '../data/LevelData';

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
