/**
 * Shared color constants for challenge types
 *
 * Used by both 3D rendering (WonderStarManager) and UI (StarSelect).
 * CSS hex format — works with both Three.js Color and CSS styles.
 */

export const CHALLENGE_COLORS: Record<string, string> = {
  exploration: '#00ff00',
  race: '#ff4444',
  puzzle: '#4488ff',
  collection: '#ff44ff',
  skill: '#ffaa00',
};

export const DEFAULT_CHALLENGE_COLOR = '#ffffff';

export function getChallengeColor(type: string): string {
  return CHALLENGE_COLORS[type] ?? DEFAULT_CHALLENGE_COLOR;
}
