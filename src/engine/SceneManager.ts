/**
 * SceneManager - Manages level loading and transitions
 *
 * Loads LevelData JSON files and coordinates level building,
 * collectibles, gates, and chapter transitions.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { LevelData } from '../data/LevelData';
import { LevelBuilder, type BuiltLevel } from '../world/LevelBuilder';
import { CollectibleManager } from '../world/Collectible';
import { Gate } from '../world/Gate';
import { HUD } from '../ui/HUD';

export class SceneManager {
  private scene: THREE.Scene;
  private levelBuilder: LevelBuilder;
  private collectibleManager: CollectibleManager;
  private hud: HUD;
  private gate: Gate | null = null;
  private currentLevel: BuiltLevel | null = null;
  private currentChapter: number = 1;

  // Callbacks
  public onChapterComplete: ((nextChapter: number) => void) | null = null;
  public onPlayerSpawn: ((position: THREE.Vector3) => void) | null = null;
  public onCollectiblePickup: ((type: string, position: THREE.Vector3) => void) | null = null;
  public onGateUnlock: ((position: THREE.Vector3) => void) | null = null;

  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.scene = scene;
    this.levelBuilder = new LevelBuilder(scene, world);
    this.collectibleManager = new CollectibleManager();
    this.hud = new HUD();

    // Wire up collectible updates to HUD
    this.collectibleManager.onCollect = (type, state, position) => {
      this.hud.updateCollectibles(state);
      if (this.onCollectiblePickup) {
        this.onCollectiblePickup(type, position);
      }
    };

    // Wire up key collection to gate unlock
    this.collectibleManager.onKeyCollected = () => {
      if (this.gate) {
        this.gate.unlock();
        this.hud.showMessage('Gate Unlocked!');
        if (this.onGateUnlock) {
          this.onGateUnlock(this.currentLevel?.gatePosition || new THREE.Vector3());
        }
      }
    };
  }

  /**
   * Load a level from JSON file
   */
  async loadLevel(chapterNumber: number): Promise<void> {
    console.log(`Loading chapter ${chapterNumber}...`);

    // Clean up previous level
    if (this.currentLevel) {
      this.currentLevel.cleanup();
    }

    // Fetch level data
    const levelData = await this.fetchLevelData(chapterNumber);
    if (!levelData) {
      console.error(`Failed to load chapter ${chapterNumber}`);
      return;
    }

    this.currentChapter = chapterNumber;

    // Build the level
    this.currentLevel = this.levelBuilder.build(levelData);

    // Setup collectibles
    this.collectibleManager.setCollectibles(this.currentLevel.collectibles);
    this.hud.updateCollectibles(this.collectibleManager.getState());

    // Setup gate
    this.gate = new Gate(this.currentLevel.gatePosition);
    this.gate.setup(this.scene);
    this.gate.onEnter = () => this.handleGateEnter();

    // Show chapter title
    this.hud.showChapterTitle(
      `Chapter ${chapterNumber}`,
      levelData.chapter_title
    );

    // Spawn player
    if (this.onPlayerSpawn) {
      this.onPlayerSpawn(this.currentLevel.spawnPoint);
    }

    console.log(`Loaded: ${levelData.chapter_title}`);
  }

  /**
   * Fetch level data from JSON file
   */
  private async fetchLevelData(chapterNumber: number): Promise<LevelData | null> {
    try {
      const response = await fetch(`/assets/fallback/chapter_${chapterNumber}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch level data:`, error);
      return null;
    }
  }

  /**
   * Handle player entering the gate
   */
  private handleGateEnter(): void {
    if (!this.gate?.getIsUnlocked()) return;

    const nextChapter = this.currentChapter + 1;

    // Check if we have more chapters
    if (nextChapter > 4) {
      this.hud.showMessage('Congratulations! You completed the demo!', 5000);
      return;
    }

    this.hud.showMessage(`Entering Chapter ${nextChapter}...`);

    // Notify game to transition
    if (this.onChapterComplete) {
      this.onChapterComplete(nextChapter);
    }
  }

  /**
   * Update all level systems
   */
  update(dt: number, playerPosition: THREE.Vector3, playerRadius: number): void {
    // Update collectibles
    this.collectibleManager.update(dt, playerPosition, playerRadius);

    // Update gate
    if (this.gate) {
      this.gate.update(dt, playerPosition);
    }

    // Check size puzzle zones
    this.checkSizePuzzleZones(playerPosition);
  }

  /**
   * Check if player is in a size puzzle zone
   */
  private checkSizePuzzleZones(playerPosition: THREE.Vector3): void {
    if (!this.currentLevel) return;

    for (const zone of this.currentLevel.sizePuzzleZones) {
      if (zone.bounds.containsPoint(playerPosition)) {
        // Player is in zone - could show hint
        // For now just log (actual size check happens in Game.ts)
      }
    }
  }

  /**
   * Get current level's size puzzle zones
   */
  getSizePuzzleZones() {
    return this.currentLevel?.sizePuzzleZones || [];
  }

  /**
   * Get NPCs for dialogue system
   */
  getNPCs() {
    return this.currentLevel?.npcs || [];
  }

  /**
   * Show a hint message
   */
  showHint(text: string): void {
    this.hud.showHint(text);
  }

  /**
   * Show a message
   */
  showMessage(text: string): void {
    this.hud.showMessage(text);
  }

  /**
   * Get current chapter
   */
  getCurrentChapter(): number {
    return this.currentChapter;
  }

  /**
   * Clean up
   */
  dispose(): void {
    if (this.currentLevel) {
      this.currentLevel.cleanup();
    }
    this.hud.dispose();
  }
}
