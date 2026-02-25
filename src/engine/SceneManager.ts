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
import { audioManager } from '../audio/AudioManager';

// Texture loader for skyboxes
const textureLoader = new THREE.TextureLoader();

export class SceneManager {
  private scene: THREE.Scene;
  private levelBuilder: LevelBuilder;
  private collectibleManager: CollectibleManager;
  private hud: HUD;
  private gate: Gate | null = null;
  private currentLevel: BuiltLevel | null = null;
  private currentChapter: number = 1;
  private currentSkyboxTexture: THREE.Texture | null = null;

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

    // Build the level (async to load NPC models)
    this.currentLevel = await this.levelBuilder.build(levelData);

    // Setup collectibles
    this.collectibleManager.setCollectibles(this.currentLevel.collectibles);
    this.hud.updateCollectibles(this.collectibleManager.getState());

    // Setup gate
    this.gate = new Gate(this.currentLevel.gatePosition);
    this.gate.setup(this.scene);
    this.gate.onEnter = () => this.handleGateEnter();

    // Load skybox
    await this.loadSkybox(chapterNumber);

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
   * Load skybox texture for the chapter
   */
  private async loadSkybox(chapterNumber: number): Promise<void> {
    // Dispose previous skybox texture
    if (this.currentSkyboxTexture) {
      this.currentSkyboxTexture.dispose();
      this.currentSkyboxTexture = null;
    }

    const skyboxPath = `${import.meta.env.BASE_URL}assets/skyboxes/chapter_${chapterNumber}.png`;

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(
          skyboxPath,
          (tex) => resolve(tex),
          undefined,
          () => reject(new Error(`Failed to load skybox: ${skyboxPath}`))
        );
      });

      // Configure as equirectangular for spherical mapping
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;

      this.scene.background = texture;
      this.currentSkyboxTexture = texture;
      console.log(`Loaded skybox for chapter ${chapterNumber}`);
    } catch {
      // Fallback to solid color background (already set by LevelBuilder atmosphere)
      console.log(`Skybox not found for chapter ${chapterNumber}, using fallback color`);
    }
  }

  /**
   * Fetch level data from JSON file
   */
  private async fetchLevelData(chapterNumber: number): Promise<LevelData | null> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}assets/fallback/chapter_${chapterNumber}.json`);
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
    const stats = this.collectibleManager.getState();

    // Play celebration jingle
    audioManager.playChapterComplete();

    // Check if we have more chapters
    if (nextChapter > 4) {
      this.hud.showChapterComplete(this.currentChapter, stats, () => {
        this.hud.showMessage('Congratulations! You completed the demo!', 5000);
      });
      return;
    }

    // Show chapter complete celebration
    this.hud.showChapterComplete(this.currentChapter, stats, () => {
      // Notify game to transition
      if (this.onChapterComplete) {
        this.onChapterComplete(nextChapter);
      }
    });
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

    // Update bouncy platforms
    this.updateBouncyPlatforms(dt, playerPosition);
  }

  /**
   * Update bouncy platform compression animation
   */
  private updateBouncyPlatforms(dt: number, playerPosition: THREE.Vector3): void {
    if (!this.currentLevel) return;

    for (const platform of this.currentLevel.bouncyPlatforms) {
      const mesh = platform.mesh;
      const bounds = new THREE.Box3().setFromObject(mesh);

      // Check if player is on this platform (above it and within horizontal bounds)
      const onPlatform =
        playerPosition.x >= bounds.min.x &&
        playerPosition.x <= bounds.max.x &&
        playerPosition.z >= bounds.min.z &&
        playerPosition.z <= bounds.max.z &&
        playerPosition.y >= bounds.max.y - 0.5 &&
        playerPosition.y <= bounds.max.y + 1.5;

      // Compress when player is on platform
      const targetCompression = onPlatform ? 0.3 : 0;
      platform.compressionAmount += (targetCompression - platform.compressionAmount) * dt * 10;

      // Spring back quickly
      if (!onPlatform && platform.compressionAmount > 0.01) {
        platform.compressionAmount *= 0.85;
      }

      // Apply compression to mesh scale
      const scaleY = 1 - platform.compressionAmount;
      const scaleXZ = 1 + platform.compressionAmount * 0.3; // Squash out slightly
      mesh.scale.set(scaleXZ, scaleY, scaleXZ);

      // Adjust position to keep top surface stable
      mesh.position.y = platform.baseY - platform.compressionAmount * 0.2;
    }
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
   * Set mute indicator
   */
  setMuted(muted: boolean): void {
    this.hud.setMuted(muted);
  }

  /**
   * Update size indicator
   */
  updateSize(size: 'small' | 'normal' | 'large'): void {
    this.hud.updateSize(size);
  }

  /**
   * Fade screen to black (for death)
   */
  fadeToBlack(): Promise<void> {
    return this.hud.fadeToBlack();
  }

  /**
   * Fade screen back in (for respawn)
   */
  fadeIn(): Promise<void> {
    return this.hud.fadeIn();
  }

  /**
   * Clean up
   */
  dispose(): void {
    if (this.currentLevel) {
      this.currentLevel.cleanup();
    }
    if (this.currentSkyboxTexture) {
      this.currentSkyboxTexture.dispose();
    }
    this.hud.dispose();
  }
}
