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
  private currentSkyboxTexture: THREE.Texture | THREE.CubeTexture | null = null;
  private skyboxMesh: THREE.Mesh | null = null;
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

    // Load skybox
    await this.loadSkybox();

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
   * Load skybox — tries cubemap images first, falls back to procedural
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
    this.scene.background = null;

    // Try loading cubemap images (AI-generated faces)
    try {
      const loader = new THREE.CubeTextureLoader();
      loader.setPath('assets/skyboxes/garden/');
      const cubeTexture = await new Promise<THREE.CubeTexture>((resolve, reject) => {
        loader.load(
          ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'],
          resolve,
          undefined,
          reject
        );
      });
      cubeTexture.colorSpace = THREE.SRGBColorSpace;
      this.scene.background = cubeTexture;
      this.currentSkyboxTexture = cubeTexture;
      console.log('Loaded cubemap skybox from images');
    } catch {
      // Fallback to procedural skybox
      this.createGardenSkybox();
    }
  }

  /**
   * Create lush procedural garden skybox — Queen's Garden golden hour
   * 2048x2048 canvas with sky gradient, sun, clouds, rolling hills, distant trees, and flowers
   */
  private createGardenSkybox(): void {
    const W = 2048;
    const H = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // --- Sky gradient: warm golden hour ---
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#4A90C4');     // Deep blue at zenith
    sky.addColorStop(0.15, '#6BB3D9');  // Mid blue
    sky.addColorStop(0.35, '#A8D8EA');  // Light blue
    sky.addColorStop(0.50, '#F5E6C8');  // Warm golden
    sky.addColorStop(0.60, '#FFD89B');  // Amber
    sky.addColorStop(0.68, '#FFCC80');  // Warm orange
    sky.addColorStop(0.75, '#E8C4A0');  // Peachy horizon
    sky.addColorStop(1.0, '#D4E8C4');   // Green-ish below horizon
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // --- Sun with layered glow ---
    const sunX = W * 0.72;
    const sunY = H * 0.48;

    // Outer glow
    const outerGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 250);
    outerGlow.addColorStop(0, 'rgba(255, 250, 220, 0.4)');
    outerGlow.addColorStop(0.4, 'rgba(255, 230, 160, 0.15)');
    outerGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = outerGlow;
    ctx.fillRect(0, 0, W, H);

    // Inner glow
    const innerGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
    innerGlow.addColorStop(0, 'rgba(255, 252, 240, 0.9)');
    innerGlow.addColorStop(0.3, 'rgba(255, 240, 190, 0.5)');
    innerGlow.addColorStop(0.7, 'rgba(255, 220, 140, 0.15)');
    innerGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = innerGlow;
    ctx.fillRect(0, 0, W, H);

    // Sun disk
    const diskGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 50);
    diskGrad.addColorStop(0, 'rgba(255, 255, 245, 1)');
    diskGrad.addColorStop(0.7, 'rgba(255, 248, 220, 0.95)');
    diskGrad.addColorStop(1, 'rgba(255, 240, 200, 0.3)');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
    ctx.fill();

    // --- Clouds at multiple depths ---
    // Far clouds (smaller, more transparent)
    ctx.globalAlpha = 0.4;
    this.drawCloud(ctx, W * 0.10, H * 0.15, 60);
    this.drawCloud(ctx, W * 0.30, H * 0.12, 45);
    this.drawCloud(ctx, W * 0.55, H * 0.20, 50);
    this.drawCloud(ctx, W * 0.82, H * 0.18, 55);

    // Mid clouds
    ctx.globalAlpha = 0.6;
    this.drawCloud(ctx, W * 0.05, H * 0.28, 90);
    this.drawCloud(ctx, W * 0.25, H * 0.22, 75);
    this.drawCloud(ctx, W * 0.50, H * 0.30, 85);
    this.drawCloud(ctx, W * 0.90, H * 0.25, 80);

    // Near clouds (larger, more opaque)
    ctx.globalAlpha = 0.75;
    this.drawCloud(ctx, W * 0.15, H * 0.35, 110);
    this.drawCloud(ctx, W * 0.42, H * 0.38, 100);
    this.drawCloud(ctx, W * 0.68, H * 0.33, 95);
    this.drawCloud(ctx, W * 0.88, H * 0.40, 80);
    ctx.globalAlpha = 1;

    // --- Rolling hills silhouette ---
    const horizonY = H * 0.68;

    // Far hills (lighter green)
    ctx.fillStyle = '#8CB878';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= W; x += 4) {
      const h = Math.sin(x * 0.003) * 40 + Math.sin(x * 0.008 + 1) * 25 + Math.sin(x * 0.015) * 12;
      ctx.lineTo(x, horizonY - 30 - h);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();

    // Mid hills (medium green)
    ctx.fillStyle = '#6B9F58';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= W; x += 4) {
      const h = Math.sin(x * 0.004 + 2) * 35 + Math.sin(x * 0.01 + 0.5) * 20 + Math.sin(x * 0.02 + 3) * 10;
      ctx.lineTo(x, horizonY - 10 - h);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();

    // Near hills (darker green)
    ctx.fillStyle = '#4A7C3F';
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 15);
    for (let x = 0; x <= W; x += 4) {
      const h = Math.sin(x * 0.005 + 4) * 30 + Math.sin(x * 0.012 + 1.5) * 18 + Math.sin(x * 0.025) * 8;
      ctx.lineTo(x, horizonY + 15 - h);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();

    // --- Distant trees along the hills ---
    this.drawTreeLine(ctx, W, horizonY - 50, '#3D6B33', 0.6, 18);
    this.drawTreeLine(ctx, W, horizonY - 25, '#2D5A27', 0.75, 25);
    this.drawTreeLine(ctx, W, horizonY + 5, '#1F4A1C', 0.85, 30);

    // --- Ground fill below horizon ---
    const groundGrad = ctx.createLinearGradient(0, horizonY + 30, 0, H);
    groundGrad.addColorStop(0, '#4A7C3F');
    groundGrad.addColorStop(0.3, '#3D6B33');
    groundGrad.addColorStop(1, '#2D5520');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY + 30, W, H - horizonY - 30);

    // --- Flower dots along the horizon ---
    const flowerColors = [
      'rgba(220, 60, 80, 0.7)',   // Red roses
      'rgba(255, 180, 200, 0.7)', // Pink roses
      'rgba(255, 255, 240, 0.6)', // White roses
      'rgba(255, 220, 100, 0.5)', // Yellow
      'rgba(200, 130, 220, 0.5)', // Purple
    ];
    for (let i = 0; i < 200; i++) {
      const fx = (i * 37 + Math.sin(i * 7.3) * 60) % W;
      const fy = horizonY + 10 + Math.sin(i * 3.1) * 25 + Math.sin(i * 0.7) * 15;
      const fr = 2 + (i % 3);
      ctx.fillStyle = flowerColors[i % flowerColors.length];
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Create sky dome mesh ---
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
    console.log('Created lush garden skybox');
  }

  /**
   * Draw a line of tree silhouettes along the hills
   */
  private drawTreeLine(
    ctx: CanvasRenderingContext2D,
    width: number,
    baseY: number,
    color: string,
    alpha: number,
    spacing: number
  ): void {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;

    for (let x = 0; x < width; x += spacing) {
      const offset = Math.sin(x * 0.01 + baseY * 0.1) * 8;
      const treeH = 15 + Math.abs(Math.sin(x * 0.037)) * 25;
      const treeW = 8 + Math.abs(Math.sin(x * 0.023)) * 10;
      const ty = baseY + offset;

      // Triangle tree (simple stylized)
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x - treeW / 2, ty + treeH);
      ctx.lineTo(x + treeW / 2, ty + treeH);
      ctx.closePath();
      ctx.fill();

      // Second layer for fullness
      ctx.beginPath();
      ctx.moveTo(x, ty + 5);
      ctx.lineTo(x - treeW * 0.4, ty + treeH * 0.8);
      ctx.lineTo(x + treeW * 0.4, ty + treeH * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw a stylized puffy cloud
   */
  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const cloudColor = 'rgba(255, 255, 255, 0.9)';
    const shadowColor = 'rgba(200, 200, 220, 0.4)';

    // Cloud shadow
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.arc(x + size * 0.05, y + size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.45, y + size * 0.12, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x - size * 0.35, y + size * 0.08, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Cloud body — overlapping circles
    ctx.fillStyle = cloudColor;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y + size * 0.05, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x - size * 0.4, y, size * 0.3, 0, Math.PI * 2);
    ctx.arc(x + size * 0.15, y - size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.arc(x - size * 0.15, y - size * 0.15, size * 0.25, 0, Math.PI * 2);
    // Extra puffs for more detail
    ctx.arc(x + size * 0.55, y - size * 0.05, size * 0.2, 0, Math.PI * 2);
    ctx.arc(x - size * 0.5, y - size * 0.1, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
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
    if (this.currentSkyboxTexture) {
      this.currentSkyboxTexture.dispose();
    }
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      this.skyboxMesh.geometry.dispose();
      (this.skyboxMesh.material as THREE.Material).dispose();
    }
    this.scene.background = null;
    this.hud.dispose();
  }
}
