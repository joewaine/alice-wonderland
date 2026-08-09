/**
 * SceneManager - Manages level loading and transitions
 *
 * Loads LevelData JSON files and coordinates level building,
 * collectibles, gates, and chapter transitions.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { LevelData } from '../data/LevelData';
import { validateLevelData } from '../data/LevelData';
import { LevelBuilder, type BuiltLevel } from '../world/LevelBuilder';
import { CollectibleManager } from '../world/Collectible';
import { Gate } from '../world/Gate';
import { HUD } from '../ui/HUD';
import { audioManager } from '../audio/AudioManager';

export class SceneManager {
  private scene: THREE.Scene;
  private levelBuilder: LevelBuilder;
  private collectibleManager: CollectibleManager;
  private hud: HUD;
  private gate: Gate | null = null;
  private currentLevel: BuiltLevel | null = null;
  private currentLevelData: LevelData | null = null;

  // Pre-allocated objects to avoid per-frame GC pressure
  private boundsCache: THREE.Box3 = new THREE.Box3();
  private expandedBoundsCache: THREE.Box3 = new THREE.Box3();
  private platformCenterCache: THREE.Vector3 = new THREE.Vector3();


  // Breakable platform stress tracking (maps platform index to stress time)
  private breakablePlatformStress: Map<number, number> = new Map();

  // Callbacks
  public onPlayerSpawn: ((position: THREE.Vector3) => void) | null = null;
  public onCollectiblePickup: ((type: string, position: THREE.Vector3) => void) | null = null;
  public onGateUnlock: ((position: THREE.Vector3) => void) | null = null;
  public onGateEnter: ((position: THREE.Vector3) => void) | null = null;
  public onCollectibleMagnetDrift: ((position: THREE.Vector3, direction: THREE.Vector3) => void) | null = null;
  public onCheckpointActivated: ((checkpoint: { position: THREE.Vector3; order: number }) => void) | null = null;
  public onBreakablePlatformStress: ((position: THREE.Vector3, intensity: number) => void) | null = null;

  constructor(scene: THREE.Scene, world: RAPIER.World, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.levelBuilder = new LevelBuilder(scene, world);
    this.collectibleManager = new CollectibleManager();
    this.hud = new HUD();

    // Wire up collectible updates to HUD and wonder star tracking
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

    // Wire up magnet drift for particle effects
    this.collectibleManager.onMagnetDrift = (position, direction) => {
      if (this.onCollectibleMagnetDrift) {
        this.onCollectibleMagnetDrift(position, direction);
      }
    };

  }

  /**
   * Load The Queen's Garden level
   */
  async loadLevel(): Promise<void> {
    console.log(`Loading The Queen's Garden...`);

    // Clean up previous level
    if (this.currentLevel) {
      this.currentLevel.cleanup();
    }

    // Fetch level data
    const levelData = await this.fetchLevelData();
    if (!levelData) {
      console.error(`Failed to load The Queen's Garden`);
      return;
    }

    // Build the level (async to load NPC models)
    this.currentLevel = await this.levelBuilder.build(levelData);

    // Setup collectibles
    this.collectibleManager.setCollectibles(this.currentLevel.collectibles);
    this.hud.updateCollectibles(this.collectibleManager.getState());

    // Setup gate (completion gate for end of level)
    this.gate = new Gate(this.currentLevel.gatePosition);
    this.gate.setup(this.scene);
    this.gate.onEnter = () => this.handleGateEnter();

    this.currentLevelData = levelData;

    // Show welcome title
    this.hud.showChapterTitle(
      "The Queen's Garden",
      levelData.setting || "Welcome to Wonderland"
    );

    // Spawn player
    if (this.onPlayerSpawn) {
      this.onPlayerSpawn(this.currentLevel.spawnPoint);
    }

    console.log(`Loaded: The Queen's Garden`);
  }

  /**
   * Fetch level data from JSON file
   */
  private async fetchLevelData(): Promise<LevelData | null> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}assets/fallback/queens_garden.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!validateLevelData(data)) {
        throw new Error('Invalid level data structure');
      }
      return data;
    } catch (error) {
      console.error(`Failed to fetch level data:`, error);
      return null;
    }
  }

  /**
   * Handle player entering the gate - level complete!
   */
  private handleGateEnter(): void {
    if (!this.gate?.getIsUnlocked()) return;

    const stats = this.collectibleManager.getState();

    // Trigger celebration effects (particles, screen shake, FOV kick)
    if (this.onGateEnter) {
      this.onGateEnter(this.currentLevel?.gatePosition || new THREE.Vector3());
    }

    // Play celebration jingle
    audioManager.playChapterComplete();

    // Show level complete celebration
    this.hud.showLevelComplete("The Queen's Garden", stats, () => {
      this.hud.showMessage('Congratulations! You conquered The Queen\'s Garden!', 5000);
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

    // Check checkpoints
    this.checkCheckpoints(playerPosition, playerRadius);

    // Update bouncy platforms
    this.updateBouncyPlatforms(dt, playerPosition);

    // Update breakable platforms (crumble warning effect)
    this.updateBreakablePlatforms(dt, playerPosition);
  }

  /**
   * Check if player passes through any checkpoints
   */
  private checkCheckpoints(playerPosition: THREE.Vector3, playerRadius: number): void {
    if (!this.currentLevel) return;

    for (const checkpoint of this.currentLevel.checkpoints) {
      if (checkpoint.passed) continue;

      // Check if player is within checkpoint radius
      const dx = playerPosition.x - checkpoint.position.x;
      const dy = playerPosition.y - checkpoint.position.y;
      const dz = playerPosition.z - checkpoint.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const threshold = checkpoint.radius + playerRadius;

      if (distSq < threshold * threshold) {
        // Checkpoint activated!
        checkpoint.passed = true;

        // Visual feedback: change checkpoint color to gold
        const material = checkpoint.mesh.material as THREE.ShaderMaterial | THREE.MeshToonMaterial;
        if (material instanceof THREE.ShaderMaterial && material.uniforms?.uColor) {
          material.uniforms.uColor.value.setHex(0xFFD700);
        } else if ('color' in material && material.color instanceof THREE.Color) {
          material.color.setHex(0xFFD700);
        }

        // Trigger callback
        if (this.onCheckpointActivated) {
          this.onCheckpointActivated({
            position: checkpoint.position.clone(),
            order: checkpoint.order
          });
        }
      }
    }
  }

  /**
   * Update bouncy platform compression animation
   */
  private updateBouncyPlatforms(dt: number, playerPosition: THREE.Vector3): void {
    if (!this.currentLevel) return;

    for (const platform of this.currentLevel.bouncyPlatforms) {
      const mesh = platform.mesh;
      // Reuse cached Box3 to avoid per-frame allocations
      this.boundsCache.setFromObject(mesh);

      // Check if player is on this platform (above it and within horizontal bounds)
      const onPlatform =
        playerPosition.x >= this.boundsCache.min.x &&
        playerPosition.x <= this.boundsCache.max.x &&
        playerPosition.z >= this.boundsCache.min.z &&
        playerPosition.z <= this.boundsCache.max.z &&
        playerPosition.y >= this.boundsCache.max.y - 0.5 &&
        playerPosition.y <= this.boundsCache.max.y + 1.5;

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
   * Update breakable platforms - track stress and emit crumble particles
   * When player stands on a breakable platform, it accumulates stress
   * and sheds particles as a warning before breaking
   */
  private updateBreakablePlatforms(dt: number, playerPosition: THREE.Vector3): void {
    if (!this.currentLevel) return;

    const breakTime = 2.0;  // Seconds before platform breaks when stood on

    for (let i = 0; i < this.currentLevel.breakablePlatforms.length; i++) {
      const platform = this.currentLevel.breakablePlatforms[i];
      if (platform.broken) continue;

      // Check if player is on top of this breakable platform
      this.expandedBoundsCache.copy(platform.bounds);
      this.expandedBoundsCache.max.y += 1.5;  // Check above platform surface
      this.expandedBoundsCache.min.y = platform.bounds.max.y - 0.2;  // Only top surface

      const isOnPlatform = this.expandedBoundsCache.containsPoint(playerPosition);

      if (isOnPlatform) {
        // Accumulate stress time
        const currentStress = this.breakablePlatformStress.get(i) || 0;
        const newStress = currentStress + dt;
        this.breakablePlatformStress.set(i, newStress);

        // Calculate intensity (0-1) based on how close to breaking
        const intensity = Math.min(newStress / breakTime, 1);

        // Emit crumble particles - position at platform center top
        platform.bounds.getCenter(this.platformCenterCache);
        this.platformCenterCache.y = platform.bounds.max.y;

        if (this.onBreakablePlatformStress) {
          this.onBreakablePlatformStress(this.platformCenterCache, intensity);
        }

        // Visual feedback: shake the platform mesh slightly
        const shakeAmount = intensity * 0.03;
        platform.mesh.position.x += (Math.random() - 0.5) * shakeAmount;
        platform.mesh.position.z += (Math.random() - 0.5) * shakeAmount;
      } else {
        // Player left the platform - slowly reduce stress
        const currentStress = this.breakablePlatformStress.get(i) || 0;
        if (currentStress > 0) {
          const newStress = Math.max(0, currentStress - dt * 0.5);  // Recover at half rate
          this.breakablePlatformStress.set(i, newStress);
        }
      }
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
   * Get current level's air current zones
   */
  getAirCurrentZones() {
    return this.currentLevel?.airCurrentZones || [];
  }

  /**
   * Get current level's water zones
   */
  getWaterZones() {
    return this.currentLevel?.waterZones || [];
  }

  /**
   * Get current level's speed boost zones
   */
  getSpeedBoostZones() {
    return this.currentLevel?.speedBoostZones || [];
  }

  /**
   * Get current level's checkpoints
   */
  getCheckpoints() {
    return this.currentLevel?.checkpoints || [];
  }

  /**
   * Get current level's breakable platforms
   */
  getBreakablePlatforms() {
    return this.currentLevel?.breakablePlatforms || [];
  }

  /**
   * Get current level's bouncy platforms
   */
  getBouncyPlatforms() {
    return this.currentLevel?.bouncyPlatforms || [];
  }

  /**
   * Get current level's platform meshes (for foliage animation)
   */
  getPlatformMeshes(): THREE.Mesh[] {
    return this.currentLevel?.platforms || [];
  }

  /**
   * Detect surface type at a position (for footstep sounds)
   * Checks which platform the player is standing on
   */
  getSurfaceTypeAt(position: THREE.Vector3): 'grass' | 'stone' | 'wood' | 'default' {
    if (!this.currentLevel) return 'grass';

    // Check each platform to see if player is on top of it
    for (const platform of this.currentLevel.platforms) {
      // Get bounding box
      if (!platform.geometry?.boundingBox) {
        platform.geometry?.computeBoundingBox();
      }

      if (platform.geometry?.boundingBox) {
        // Transform bounding box to world space using cached Box3
        this.boundsCache.copy(platform.geometry.boundingBox);

        // For groups (garden assets), use the group's position
        if (platform instanceof THREE.Group) {
          this.boundsCache.translate(platform.position);
        } else {
          // Apply mesh's world transform
          this.boundsCache.applyMatrix4(platform.matrixWorld);
        }

        // Expand slightly above the platform surface
        this.expandedBoundsCache.copy(this.boundsCache);
        this.expandedBoundsCache.max.y += 1.5; // Check above platform
        this.expandedBoundsCache.min.y = this.expandedBoundsCache.max.y - 2; // Only check near the top

        if (this.expandedBoundsCache.containsPoint(position)) {
          // Return surface type from userData
          const surfaceType = platform.userData?.surfaceType;
          if (surfaceType === 'grass' || surfaceType === 'stone' || surfaceType === 'wood') {
            return surfaceType;
          }
          return 'grass'; // Default for garden
        }
      }
    }

    // Default to grass for garden setting
    return 'grass';
  }

  /**
   * Try to break a platform at the given position
   * Returns true if a platform was broken
   */
  tryBreakPlatform(position: THREE.Vector3, playerSize: 'small' | 'normal' | 'large'): boolean {
    if (!this.currentLevel) return false;

    for (const platform of this.currentLevel.breakablePlatforms) {
      if (platform.broken) continue;

      // Check if position is on top of the platform
      const expandedBounds = platform.bounds.clone();
      expandedBounds.max.y += 1;  // Check slightly above platform

      if (expandedBounds.containsPoint(position)) {
        // Check if player has required size
        if (platform.requiresSize && playerSize !== platform.requiresSize) {
          return false;  // Wrong size
        }

        // Break the platform!
        platform.broken = true;

        // Remove from scene
        this.scene.remove(platform.mesh);
        platform.mesh.geometry.dispose();
        (platform.mesh.material as THREE.Material).dispose();

        // Remove physics body
        this.levelBuilder.removeRigidBody(platform.body);

        console.log('Platform broken!');
        return true;
      }
    }

    return false;
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
   * Flash screen (for checkpoint)
   */
  flashScreen(): void {
    this.hud.flashScreen();
  }

  /**
   * Get quests for current level (for QuestManager)
   */
  getQuests(): import('../data/LevelData').Quest[] {
    return this.currentLevelData?.quests || [];
  }

  /**
   * Get areas for current level (for QuestManager)
   */
  getAreas(): import('../data/LevelData').Area[] {
    return this.currentLevelData?.areas || [];
  }

  /**
   * Get raw NPC data for current level (for QuestManager)
   */
  getNPCData(): import('../data/LevelData').NPC[] {
    return this.currentLevelData?.npcs || [];
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
