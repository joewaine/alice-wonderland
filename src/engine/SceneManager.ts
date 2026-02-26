/**
 * SceneManager - Manages level loading and transitions
 *
 * Loads LevelData JSON files and coordinates level building,
 * collectibles, gates, and chapter transitions.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { LevelData, WonderStar } from '../data/LevelData';
import { LevelBuilder, type BuiltLevel } from '../world/LevelBuilder';
import { CollectibleManager } from '../world/Collectible';
import { WonderStarManager } from '../world/WonderStarManager';
import { Gate } from '../world/Gate';
import { HUD } from '../ui/HUD';
import { audioManager } from '../audio/AudioManager';

export class SceneManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private levelBuilder: LevelBuilder;
  private collectibleManager: CollectibleManager;
  private wonderStarManager: WonderStarManager;
  private hud: HUD;
  private gate: Gate | null = null;
  private currentLevel: BuiltLevel | null = null;
  private currentSkyboxTexture: THREE.Texture | null = null;
  private skyboxMesh: THREE.Mesh | null = null;
  private currentLevelData: LevelData | null = null;

  // Pre-allocated objects to avoid per-frame GC pressure
  private boundsCache: THREE.Box3 = new THREE.Box3();

  // Wind animation state
  private windTime: number = 0;
  private foliageMeshes: THREE.Object3D[] = [];

  // Callbacks
  public onPlayerSpawn: ((position: THREE.Vector3) => void) | null = null;
  public onCollectiblePickup: ((type: string, position: THREE.Vector3) => void) | null = null;
  public onGateUnlock: ((position: THREE.Vector3) => void) | null = null;
  public onGateEnter: ((position: THREE.Vector3) => void) | null = null;
  public onWonderStarCollected: ((star: WonderStar, collected: number, total: number) => void) | null = null;
  public onCollectibleMagnetDrift: ((position: THREE.Vector3, direction: THREE.Vector3) => void) | null = null;
  public onCheckpointActivated: ((checkpoint: { position: THREE.Vector3; order: number }) => void) | null = null;

  constructor(scene: THREE.Scene, world: RAPIER.World, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.levelBuilder = new LevelBuilder(scene, world);
    this.collectibleManager = new CollectibleManager();
    this.wonderStarManager = new WonderStarManager(scene);
    this.hud = new HUD();

    // Wire up collectible updates to HUD and wonder star tracking
    this.collectibleManager.onCollect = (type, state, position) => {
      this.hud.updateCollectibles(state);
      if (this.onCollectiblePickup) {
        this.onCollectiblePickup(type, position);
      }
      // Track for wonder star challenges
      this.wonderStarManager.trackCollectible(type as 'star' | 'card' | 'key');
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

    // Wire up wonder star collection
    this.wonderStarManager.onStarCollected = (star, collected, total) => {
      this.hud.showMessage(`Wonder Star: ${star.name}!`, 3000);
      audioManager.playKeyCollect();  // Use key sound for wonder stars
      this.onWonderStarCollected?.(star, collected, total);
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

    // Setup wonder stars
    this.currentLevelData = levelData;
    if (levelData.wonder_stars) {
      this.wonderStarManager.setStars(levelData.wonder_stars);
    }

    // Load skybox
    await this.loadSkybox();

    // Collect foliage meshes for wind animation
    this.collectFoliageMeshes();

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
   * Load skybox as a large inverted sphere
   */
  private async loadSkybox(): Promise<void> {
    // Dispose previous skybox
    if (this.currentSkyboxTexture) {
      this.currentSkyboxTexture.dispose();
      this.currentSkyboxTexture = null;
    }
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      this.skyboxMesh.geometry.dispose();
      (this.skyboxMesh.material as THREE.Material).dispose();
      this.skyboxMesh = null;
    }

    const skyboxPath = `${import.meta.env.BASE_URL}assets/skyboxes/queens_garden.png`;

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          skyboxPath,
          (tex) => resolve(tex),
          undefined,
          () => reject(new Error(`Failed to load skybox`))
        );
      });

      // Configure texture filtering for maximum quality
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      this.currentSkyboxTexture = texture;

      // Create inverted sphere for skybox (texture on inside)
      const geometry = new THREE.SphereGeometry(500, 64, 32);
      geometry.scale(-1, 1, 1);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide,
        depthWrite: false
      });

      this.skyboxMesh = new THREE.Mesh(geometry, material);
      this.skyboxMesh.renderOrder = -1;
      this.scene.add(this.skyboxMesh);

      // Clear scene background color
      this.scene.background = null;

      console.log(`Loaded skybox for The Queen's Garden`);
    } catch {
      // Fallback to gradient
      this.createGradientSkybox();
    }
  }

  /**
   * Create fallback gradient skybox - Queen's Garden golden hour with clouds
   */
  private createGradientSkybox(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Golden hour gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#5B9BD5');    // Sky blue at top
    gradient.addColorStop(0.3, '#87CEEB');   // Light blue
    gradient.addColorStop(0.5, '#FAD7A0');   // Golden
    gradient.addColorStop(0.7, '#FFCC80');   // Warm orange
    gradient.addColorStop(1, '#FFE4B5');     // Light peach at horizon

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw sun glow
    const sunX = canvas.width * 0.7;
    const sunY = canvas.height * 0.55;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 150);
    sunGlow.addColorStop(0, 'rgba(255, 248, 220, 0.9)');
    sunGlow.addColorStop(0.2, 'rgba(255, 223, 150, 0.6)');
    sunGlow.addColorStop(0.5, 'rgba(255, 200, 100, 0.2)');
    sunGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw sun disk
    ctx.fillStyle = 'rgba(255, 250, 230, 0.95)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Draw stylized clouds (BotW-inspired puffy shapes)
    ctx.globalAlpha = 0.7;
    this.drawCloud(ctx, canvas.width * 0.15, canvas.height * 0.25, 80);
    this.drawCloud(ctx, canvas.width * 0.4, canvas.height * 0.18, 60);
    this.drawCloud(ctx, canvas.width * 0.85, canvas.height * 0.32, 70);
    this.drawCloud(ctx, canvas.width * 0.55, canvas.height * 0.38, 50);
    this.drawCloud(ctx, canvas.width * 0.25, canvas.height * 0.42, 45);
    ctx.globalAlpha = 1;

    // Create inverted sphere for sky dome
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const geometry = new THREE.SphereGeometry(500, 64, 32);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
      depthWrite: false
    });

    this.skyboxMesh = new THREE.Mesh(geometry, material);
    this.skyboxMesh.renderOrder = -1;
    this.scene.add(this.skyboxMesh);
    this.scene.background = null;

    this.currentSkyboxTexture = texture;
    console.log(`Using procedural golden hour skybox with clouds`);
  }

  /**
   * Draw a stylized puffy cloud
   */
  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const cloudColor = 'rgba(255, 255, 255, 0.9)';
    const shadowColor = 'rgba(200, 200, 220, 0.4)';

    // Cloud made of overlapping circles
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.arc(x + size * 0.05, y + size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.45, y + size * 0.12, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x - size * 0.35, y + size * 0.08, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cloudColor;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y + size * 0.05, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x - size * 0.4, y, size * 0.3, 0, Math.PI * 2);
    ctx.arc(x + size * 0.15, y - size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.arc(x - size * 0.15, y - size * 0.15, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Collect foliage meshes for wind animation
   */
  private collectFoliageMeshes(): void {
    this.foliageMeshes = [];
    if (!this.currentLevel) return;

    // Traverse all level objects to find foliage (hedges, roses, topiaries)
    this.scene.traverse((object) => {
      // Look for objects that are likely foliage based on their material colors
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.ShaderMaterial;
        if (material.uniforms?.color) {
          const color = material.uniforms.color.value as THREE.Color;
          // Green colors (hedges, topiaries) - check if predominantly green
          if (color.g > 0.3 && color.g > color.r && color.g > color.b * 0.8) {
            this.foliageMeshes.push(object);
          }
        }
      }
      // Also include Groups that contain foliage (rose bushes, topiaries)
      if (object.name && (
        object.name.includes('hedge') ||
        object.name.includes('rose') ||
        object.name.includes('topiary')
      )) {
        this.foliageMeshes.push(object);
      }
    });

    console.log(`Found ${this.foliageMeshes.length} foliage objects for wind animation`);
  }

  /**
   * Update wind animation on foliage
   */
  private updateWindAnimation(dt: number): void {
    this.windTime += dt;

    for (let i = 0; i < this.foliageMeshes.length; i++) {
      const mesh = this.foliageMeshes[i];

      // Create gentle swaying motion using sin waves
      // Use mesh position as seed for variation
      const seed = mesh.position.x * 0.1 + mesh.position.z * 0.15;
      const swayX = Math.sin(this.windTime * 1.2 + seed) * 0.015;
      const swayZ = Math.sin(this.windTime * 0.9 + seed + 1.5) * 0.012;

      // Apply rotation-based sway (more natural than position shift)
      mesh.rotation.x = swayX;
      mesh.rotation.z = swayZ;
    }
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
      return await response.json();
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

    // Update wonder stars
    this.wonderStarManager.update(dt, playerPosition, playerRadius);

    // Track exploration challenges (player reaching positions)
    this.wonderStarManager.trackReachPosition(playerPosition);

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

    // Animate foliage wind
    this.updateWindAnimation(dt);
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
        const material = checkpoint.mesh.material as THREE.ShaderMaterial;
        if (material.uniforms?.uColor) {
          material.uniforms.uColor.value.setHex(0xFFD700);
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
        const checkBounds = this.boundsCache.clone();
        checkBounds.max.y += 1.5; // Check above platform
        checkBounds.min.y = checkBounds.max.y - 2; // Only check near the top

        if (checkBounds.containsPoint(position)) {
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
        this.levelBuilder['world'].removeRigidBody(platform.body);

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

  // ===== Wonder Star Methods =====

  /**
   * Get wonder stars for current level
   */
  getWonderStars(): WonderStar[] {
    return this.currentLevelData?.wonder_stars || [];
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
   * Get collected star IDs
   */
  getCollectedStarIds(): string[] {
    return this.wonderStarManager.getStars()
      .filter(s => s.collected)
      .map(s => s.data.id);
  }

  /**
   * Set active wonder star challenge
   */
  setActiveWonderStar(starId: string | null): void {
    this.wonderStarManager.setActiveStar(starId);
  }

  /**
   * Get spawn point for active star (if specified)
   */
  getActiveStarSpawn(): THREE.Vector3 | null {
    return this.wonderStarManager.getActiveStarSpawn();
  }

  /**
   * Track platform break for wonder star challenges
   */
  trackPlatformBreak(): void {
    this.wonderStarManager.trackPlatformBreak();
  }

  /**
   * Track ground pound for wonder star challenges
   */
  trackGroundPound(): void {
    this.wonderStarManager.trackGroundPound();
  }

  /**
   * Track long jump for wonder star challenges
   */
  trackLongJump(): void {
    this.wonderStarManager.trackLongJump();
  }

  /**
   * Get wonder star stats
   */
  getWonderStarStats(): { collected: number; total: number } {
    return this.wonderStarManager.getStats();
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
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      this.skyboxMesh.geometry.dispose();
      (this.skyboxMesh.material as THREE.Material).dispose();
    }
    this.wonderStarManager.cleanup();
    this.hud.dispose();
  }
}
