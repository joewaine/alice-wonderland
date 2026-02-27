/**
 * ParticleManager - Handles particle effects for atmosphere and magic moments
 *
 * Creates floating ambient particles and burst effects for:
 * - Size changes (shrink/grow)
 * - Collectible pickups
 * - Gate unlocking
 */

import * as THREE from 'three';

interface ParticleSystem {
  points: THREE.Points;
  velocities: Float32Array;
  lifetimes: Float32Array;
  maxLife: number;
  isLooping: boolean;
  elapsed: number;
  noGravity?: boolean;
  pooled?: boolean;  // Track if this system came from the pool
}

// Max particles any single burst effect uses (triple jump spiral = 35)
const POOL_MAX_PARTICLES = 35;
const POOL_INITIAL_SIZE = 20;

export class ParticleManager {
  private scene: THREE.Scene;
  private systems: ParticleSystem[] = [];
  private static readonly MAX_SYSTEMS = 80;

  // Object pool for burst particle systems
  private pool: ParticleSystem[] = [];

  // Ambient particles
  private ambientParticles: THREE.Points | null = null;

  // Rose petal system (for Queen's Garden)
  private rosePetals: {
    points: THREE.Points;
    velocities: Float32Array;
    bounds: THREE.Box3;
  } | null = null;

  // Pre-allocated vectors for updateRosePetals to avoid per-frame GC pressure
  private readonly defaultWindDirection: THREE.Vector3 = new THREE.Vector3(0.3, 0, 0.1);
  private readonly roseSizeCache: THREE.Vector3 = new THREE.Vector3();
  private readonly roseCenterCache: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPool();
  }

  /**
   * Pre-allocate pool of reusable particle systems to avoid per-burst allocation
   */
  private initPool(): void {
    for (let i = 0; i < POOL_INITIAL_SIZE; i++) {
      this.pool.push(this.createPooledSystem());
    }
  }

  /**
   * Create a single pooled particle system with max-capacity buffers
   */
  private createPooledSystem(): ParticleSystem {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(POOL_MAX_PARTICLES * 3);
    const colors = new Float32Array(POOL_MAX_PARTICLES * 3);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0); // Hidden until acquired

    const material = new THREE.PointsMaterial({
      size: 0.2,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.visible = false;

    return {
      points,
      velocities: new Float32Array(POOL_MAX_PARTICLES * 3),
      lifetimes: new Float32Array(POOL_MAX_PARTICLES),
      maxLife: 1,
      isLooping: false,
      elapsed: 0,
      pooled: true
    };
  }

  /**
   * Acquire a particle system from the pool.
   * Grows the pool if empty.
   */
  private acquireSystem(
    count: number,
    options: {
      size?: number;
      blending?: THREE.Blending;
      vertexColors?: boolean;
      color?: number;
      maxLife: number;
      noGravity?: boolean;
    }
  ): ParticleSystem {
    let system = this.pool.pop();

    if (!system) {
      system = this.createPooledSystem();
    }

    // Configure material for this burst
    const mat = system.points.material as THREE.PointsMaterial;
    mat.size = options.size ?? 0.2;
    mat.blending = options.blending ?? THREE.AdditiveBlending;
    mat.opacity = 1;

    if (options.vertexColors === false) {
      mat.vertexColors = false;
      mat.color.set(options.color ?? 0xffffff);
    } else {
      mat.vertexColors = true;
    }

    // Set draw range for actual particle count
    system.points.geometry.setDrawRange(0, count);
    system.maxLife = options.maxLife;
    system.elapsed = 0;
    system.noGravity = options.noGravity ?? false;
    system.points.visible = true;

    // Add to scene
    if (!system.points.parent) {
      this.scene.add(system.points);
    }

    return system;
  }

  /**
   * Release a particle system back to the pool
   */
  private releaseSystem(system: ParticleSystem): void {
    system.points.visible = false;
    system.points.geometry.setDrawRange(0, 0);
    system.elapsed = 0;
    this.pool.push(system);
  }

  /**
   * Create ambient floating particles (spores, sparkles, dust)
   */
  createAmbientParticles(color: number = 0xffffff, count: number = 200): void {
    // Clean up existing
    if (this.ambientParticles) {
      this.scene.remove(this.ambientParticles);
      this.ambientParticles.geometry.dispose();
      (this.ambientParticles.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Spread particles in a large volume
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      sizes[i] = Math.random() * 0.3 + 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  /**
   * Update ambient particles (gentle floating motion)
   */
  updateAmbientParticles(dt: number, playerPosition: THREE.Vector3): void {
    if (!this.ambientParticles) return;

    const positions = this.ambientParticles.geometry.attributes.position;
    const arr = positions.array as Float32Array;

    for (let i = 0; i < positions.count; i++) {
      // Gentle floating upward
      arr[i * 3 + 1] += dt * 0.5;

      // Slight horizontal drift
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.5 + i) * dt * 0.2;
      arr[i * 3 + 2] += Math.cos(arr[i * 3 + 1] * 0.3 + i) * dt * 0.2;

      // Respawn if too high
      if (arr[i * 3 + 1] > 30) {
        arr[i * 3 + 1] = 0;
        arr[i * 3] = playerPosition.x + (Math.random() - 0.5) * 50;
        arr[i * 3 + 2] = playerPosition.z + (Math.random() - 0.5) * 50;
      }
    }

    positions.needsUpdate = true;
  }

  /**
   * Burst effect for size changes
   * @param position - Player position
   * @param growing - true for grow (pink/red, expand outward), false for shrink (blue/purple, collapse inward)
   */
  createSizeChangeBurst(
    position: THREE.Vector3,
    growing: boolean
  ): void {
    const count = 24;
    const system = this.acquireSystem(count, {
      size: 0.3,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      maxLife: 0.6,
      noGravity: true
    });

    const positions = (system.points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const colors = (system.points.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;

    // Color palettes based on growing/shrinking
    const burstColors = growing
      ? [new THREE.Color(0xFF69B4), new THREE.Color(0xFF1493)]  // Pink/red for growing
      : [new THREE.Color(0x4169E1), new THREE.Color(0x9370DB)]; // Blue/purple for shrinking

    for (let i = 0; i < count; i++) {
      // Ring pattern - particles start around the player
      const angle = (i / count) * Math.PI * 2;
      const ringRadius = growing ? 0.3 : 1.5;  // Start close if growing, far if shrinking

      positions[i * 3] = position.x + Math.cos(angle) * ringRadius;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * ringRadius;

      // Assign alternating colors
      const color = burstColors[i % 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Velocity direction based on grow/shrink
      const speed = 2.5 + Math.random() * 1.5;
      if (growing) {
        // Expand outward from center
        system.velocities[i * 3] = Math.cos(angle) * speed;
        system.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        system.velocities[i * 3 + 2] = Math.sin(angle) * speed;
      } else {
        // Collapse inward toward center
        system.velocities[i * 3] = -Math.cos(angle) * speed;
        system.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        system.velocities[i * 3 + 2] = -Math.sin(angle) * speed;
      }

      system.lifetimes[i] = 1.0;
    }

    (system.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (system.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.systems.push(system);
  }

  /**
   * Sparkle burst for collectible pickup
   */
  createCollectBurst(position: THREE.Vector3, color: number = 0xffd700): void {
    const count = 20;
    const system = this.acquireSystem(count, {
      size: 0.25,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
      color,
      maxLife: 0.8
    });

    const positions = (system.points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Upward burst
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;

      system.velocities[i * 3] = Math.cos(angle) * speed * 0.5;
      system.velocities[i * 3 + 1] = Math.random() * 3 + 2;
      system.velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.5;

      system.lifetimes[i] = 1.0;
    }

    (system.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.systems.push(system);
  }

  /**
   * Landing dust effect with surface-specific colors
   * @param position - Landing position
   * @param intensity - Effect intensity (scales particle count)
   * @param surfaceType - Surface type for color selection (grass, stone, wood, bouncy)
   */
  createLandingDust(position: THREE.Vector3, intensity: number = 1, surfaceType: string = 'grass'): void {
    const count = Math.min(Math.floor(15 * intensity), POOL_MAX_PARTICLES);
    const system = this.acquireSystem(count, {
      size: 0.2,
      blending: THREE.NormalBlending,
      vertexColors: true,
      maxLife: 0.5
    });
    (system.points.material as THREE.PointsMaterial).opacity = 0.7;

    const positions = (system.points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const colors = (system.points.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;

    // Surface-specific color palettes
    let dustColors: THREE.Color[];
    switch (surfaceType) {
      case 'grass':
        dustColors = [new THREE.Color(0x7CB342), new THREE.Color(0x8D6E63), new THREE.Color(0x9CCC65)];
        break;
      case 'stone':
        dustColors = [new THREE.Color(0x9E9E9E), new THREE.Color(0xBDBDBD), new THREE.Color(0x757575)];
        break;
      case 'wood':
        dustColors = [new THREE.Color(0xD7CCC8), new THREE.Color(0xA1887F), new THREE.Color(0xBCAAA4)];
        break;
      case 'bouncy':
      default:
        dustColors = [new THREE.Color(0xccbb99), new THREE.Color(0xd4c4a8), new THREE.Color(0xc4b488)];
    }

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y - 0.5;
      positions[i * 3 + 2] = position.z;

      const color = dustColors[Math.floor(Math.random() * dustColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;

      system.velocities[i * 3] = Math.cos(angle) * speed;
      system.velocities[i * 3 + 1] = Math.random() * 1.5;
      system.velocities[i * 3 + 2] = Math.sin(angle) * speed;

      system.lifetimes[i] = 1.0;
    }

    (system.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (system.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.systems.push(system);
  }

  // Footstep dust throttling
  private lastFootstepTime: number = 0;
  private footstepInterval: number = 0.2;  // Seconds between footstep particles

  // Run dust puff throttling
  private lastRunDustTime: number = 0;
  private runDustInterval: number = 0.15;  // Seconds between run dust puffs

  /**
   * Footstep dust puff (small, subtle)
   * Call frequently when player is walking - throttled internally
   */
  createFootstepDust(position: THREE.Vector3, movementSpeed: number = 1): void {
    const now = performance.now() / 1000;
    if (now - this.lastFootstepTime < this.footstepInterval) return;
    this.lastFootstepTime = now;

    // Only create dust if moving fast enough
    if (movementSpeed < 0.3) return;

    const count = 4;
    const system = this.acquireSystem(count, {
      size: 0.08,
      blending: THREE.NormalBlending,
      vertexColors: false,
      color: 0xd4c4a8,
      maxLife: 0.3
    });
    (system.points.material as THREE.PointsMaterial).opacity = 0.5;

    const positions = (system.points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = position.y - 0.8;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.5 + 0.2;

      system.velocities[i * 3] = Math.cos(angle) * speed;
      system.velocities[i * 3 + 1] = Math.random() * 0.5 + 0.2;
      system.velocities[i * 3 + 2] = Math.sin(angle) * speed;

      system.lifetimes[i] = 1.0;
    }

    (system.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.systems.push(system);
  }

  /**
   * Run dust puff - more prominent dust when running at full speed
   * Stone/dust colors, puff outward and slightly up, quick fade
   */
  createRunDustPuff(position: THREE.Vector3): void {
    const now = performance.now() / 1000;
    if (now - this.lastRunDustTime < this.runDustInterval) return;
    this.lastRunDustTime = now;

    const count = 5 + Math.floor(Math.random() * 4);  // 5-8 particles
    const system = this.acquireSystem(count, {
      size: 0.12,
      blending: THREE.NormalBlending,
      vertexColors: true,
      maxLife: 0.2
    });
    (system.points.material as THREE.PointsMaterial).opacity = 0.7;

    const positions = (system.points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const colors = (system.points.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;

    const dustColors = [
      new THREE.Color(0xD2B48C),
      new THREE.Color(0xC4A882),
      new THREE.Color(0xBEB5A0),
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = position.y - 0.7;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.4;

      const color = dustColors[Math.floor(Math.random() * dustColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.8;

      system.velocities[i * 3] = Math.cos(angle) * speed;
      system.velocities[i * 3 + 1] = Math.random() * 1.2 + 0.5;
      system.velocities[i * 3 + 2] = Math.sin(angle) * speed;

      system.lifetimes[i] = 1.0;
    }

    (system.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (system.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.systems.push(system);
  }

  /**
   * Double jump expanding ring effect
   * Cyan/white particles arranged in a circle that expand outward horizontally
   */
  createDoubleJumpRing(position: THREE.Vector3): void {
    const count = 16;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Ring color palette (cyan to white)
    const ringColors = [
      new THREE.Color(0x00FFFF),  // Cyan
      new THREE.Color(0xFFFFFF),  // White
      new THREE.Color(0x87CEEB),  // Sky blue
    ];

    for (let i = 0; i < count; i++) {
      // Start in a small circle around player
      const angle = (i / count) * Math.PI * 2;
      const startRadius = 0.2;

      positions[i * 3] = position.x + Math.cos(angle) * startRadius;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * startRadius;

      // Assign colors cycling through palette
      const color = ringColors[i % ringColors.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Expand outward horizontally (no vertical movement)
      // Speed calculated to reach ~2 unit radius in 0.4 seconds
      const expandSpeed = 4.5;
      velocities[i * 3] = Math.cos(angle) * expandSpeed;
      velocities[i * 3 + 1] = 0;  // No vertical movement
      velocities[i * 3 + 2] = Math.sin(angle) * expandSpeed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.4,  // 0.4 second duration
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Ring stays horizontal
    });
  }

  /**
   * Double jump sparkle burst
   * Cyan/white spiral burst around player
   */
  createDoubleJumpSparkle(position: THREE.Vector3): void {
    const count = 22;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Sparkle color palette (cyan to white)
    const sparkleColors = [
      new THREE.Color(0x88CCFF),  // Light cyan
      new THREE.Color(0xAADDFF),  // Pale cyan
      new THREE.Color(0xFFFFFF),  // White
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Assign random sparkle color
      const color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Spiral/burst pattern - outward with upward bias
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const outwardSpeed = Math.random() * 2 + 1.5;
      const upwardSpeed = Math.random() * 3 + 2;

      velocities[i * 3] = Math.cos(angle) * outwardSpeed;
      velocities[i * 3 + 1] = upwardSpeed;
      velocities[i * 3 + 2] = Math.sin(angle) * outwardSpeed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.5,  // Short lifetime (0.4-0.6s range)
      isLooping: false,
      elapsed: 0
    });
  }

  /**
   * Triple jump spiral burst - gold/rainbow upward spiral
   * Bigger and more dramatic than double jump to reward the chain
   */
  createTripleJumpSpiral(position: THREE.Vector3): void {
    const count = 35;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Gold/rainbow palette for the highest jump
    const spiralColors = [
      new THREE.Color(0xFFD700),  // Gold
      new THREE.Color(0xFFA500),  // Orange
      new THREE.Color(0xFFFF00),  // Yellow
      new THREE.Color(0xFFFFFF),  // White
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const color = spiralColors[Math.floor(Math.random() * spiralColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Tight spiral pattern - two full rotations upward
      const t = i / count;
      const angle = t * Math.PI * 4; // Two full spirals
      const radius = 0.8 + t * 1.5;  // Expanding outward
      const upSpeed = 4 + t * 6;     // Accelerating upward

      velocities[i * 3] = Math.cos(angle) * radius;
      velocities[i * 3 + 1] = upSpeed;
      velocities[i * 3 + 2] = Math.sin(angle) * radius;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.7,
      isLooping: false,
      elapsed: 0
    });
  }

  /**
   * Long jump motion trail - line of particles behind player
   * Cyan/white particles that fade quickly for speed effect
   */
  createLongJumpTrail(position: THREE.Vector3, direction: THREE.Vector3): void {
    const count = 10;  // 8-12 particles in a line

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Trail color palette (cyan to white, matching double-jump)
    const trailColors = [
      new THREE.Color(0x88CCFF),  // Light cyan
      new THREE.Color(0xAADDFF),  // Pale cyan
    ];

    // Normalize direction for positioning
    const dir = direction.clone().normalize();

    for (let i = 0; i < count; i++) {
      // Position particles in a line behind the player
      // Offset increases for particles further back in the trail
      const offset = (i / count) * 1.5;  // Spread over 1.5 units behind player
      positions[i * 3] = position.x - dir.x * offset + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = position.z - dir.z * offset + (Math.random() - 0.5) * 0.2;

      // Assign alternating cyan colors
      const color = trailColors[i % 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Slight outward drift from the trail line
      const perpX = -dir.z;  // Perpendicular to movement direction
      const perpZ = dir.x;
      const drift = (Math.random() - 0.5) * 2;

      velocities[i * 3] = perpX * drift;
      velocities[i * 3 + 1] = Math.random() * 0.5;  // Slight upward float
      velocities[i * 3 + 2] = perpZ * drift;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.25,  // Short lifetime (0.2-0.3s range)
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Trail particles float, don't fall
    });
  }

  /**
   * Wall slide dust/sparks - small particles when sliding along walls
   * Stone/dust colors that drift slightly away from wall
   */
  createWallSlideParticles(position: THREE.Vector3, wallNormal: THREE.Vector3): void {
    const count = 4;
    const system = this.acquireSystem(count, {
      size: 0.08,
      blending: THREE.NormalBlending,
      vertexColors: true,
      maxLife: 0.2
    });
    (system.points.material as THREE.PointsMaterial).opacity = 0.6;

    const positions = (system.points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const colors = (system.points.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;

    const dustColors = [new THREE.Color(0xD2B48C), new THREE.Color(0xC4A882)];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.2;

      const color = dustColors[i % 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const driftSpeed = Math.random() * 1.5 + 0.5;
      system.velocities[i * 3] = wallNormal.x * driftSpeed + (Math.random() - 0.5) * 0.5;
      system.velocities[i * 3 + 1] = Math.random() * 0.3 - 0.1;
      system.velocities[i * 3 + 2] = wallNormal.z * driftSpeed + (Math.random() - 0.5) * 0.5;

      system.lifetimes[i] = 1.0;
    }

    (system.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (system.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.systems.push(system);
  }

  /**
   * Wall jump spark burst - impactful visual feedback for wall kicks
   * White/yellow sparks that shoot away from wall
   */
  createWallJumpSpark(position: THREE.Vector3, wallNormal: THREE.Vector3): void {
    const count = 12;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Spark color palette (white to yellow/gold)
    const sparkColors = [
      new THREE.Color(0xFFFFFF),  // White
      new THREE.Color(0xFFFACD),  // Lemon chiffon
      new THREE.Color(0xFFD700),  // Gold
    ];

    for (let i = 0; i < count; i++) {
      // Start at wall contact point
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.2;

      // Assign random spark color
      const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Particles shoot away from wall with spread
      const baseSpeed = Math.random() * 4 + 3;  // Fast-moving sparks
      const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.5;  // Spread in a cone

      // Calculate spread direction perpendicular to wall normal
      const perpX = -wallNormal.z;
      const perpZ = wallNormal.x;

      velocities[i * 3] = wallNormal.x * baseSpeed + perpX * Math.sin(spreadAngle) * 2;
      velocities[i * 3 + 1] = (Math.random() - 0.3) * 3;  // Slight upward bias
      velocities[i * 3 + 2] = wallNormal.z * baseSpeed + perpZ * Math.sin(spreadAngle) * 2;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.4,  // 0.4 second duration
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Sparks float, don't fall
    });
  }

  /**
   * Ground pound shockwave - expanding ring of particles
   */
  createGroundPoundShockwave(position: THREE.Vector3): void {
    const count = 36;  // Ring of particles

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Gold/orange color palette
    const shockwaveColors = [
      new THREE.Color(0xFFAA33),  // Gold
      new THREE.Color(0xFFCC66),  // Light gold
    ];

    for (let i = 0; i < count; i++) {
      // Start at impact point (at ground level)
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y - 0.5;  // Ground level
      positions[i * 3 + 2] = position.z;

      // Assign alternating gold colors
      const color = shockwaveColors[i % 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Expand outward in a ring (no Y velocity)
      const angle = (i / count) * Math.PI * 2;
      const speed = 8 + Math.random() * 2;  // Fast outward expansion

      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = 0;  // No vertical movement
      velocities[i * 3 + 2] = Math.sin(angle) * speed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.35,  // Short lifetime (0.3-0.4s)
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Shockwave stays at ground level
    });
  }

  /**
   * Swimming bubbles trail - small bubbles floating upward when underwater
   * Creates 2-3 bubbles per call, throttled to spawn every 0.2 seconds
   * @param position - Player position underwater
   */
  createSwimmingBubbles(position: THREE.Vector3): void {
    const now = performance.now() / 1000;
    if (now - this.lastSwimmingBubblesTime < this.swimmingBubblesInterval) return;
    this.lastSwimmingBubblesTime = now;

    const count = 2 + Math.floor(Math.random() * 2);  // 2-3 bubbles

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Bubble color palette (light blue to white)
    const bubbleColors = [
      new THREE.Color(0xADD8E6),  // Light blue
      new THREE.Color(0xE0FFFF),  // Light cyan
      new THREE.Color(0xFFFFFF),  // White
    ];

    for (let i = 0; i < count; i++) {
      // Start slightly behind/below player with random offset
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = position.y - 0.3 + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.4;

      // Assign random bubble color
      const color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Bubbles float upward with slight wobble
      // Wobble is achieved through horizontal velocity variation
      velocities[i * 3] = (Math.random() - 0.5) * 0.8;  // Horizontal wobble X
      velocities[i * 3 + 1] = Math.random() * 1.5 + 1.5;  // Upward (1.5-3.0)
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;  // Horizontal wobble Z

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05 + Math.random() * 0.05,  // Size 0.05-0.1
      transparent: true,
      opacity: 0.7,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.8,  // 0.8 second duration
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Bubbles float upward, don't fall
    });
  }

  /**
   * Water splash effect - particles spray upward and outward
   * @param position - splash position (water surface level)
   * @param intensity - 0-1 for low (swimming), 1+ for high (water entry)
   */
  createWaterSplash(position: THREE.Vector3, intensity: number = 1): void {
    // Scale particle count based on intensity (15-25 range)
    const count = Math.floor(15 + Math.min(intensity, 1) * 10);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Water splash color palette (blue to white)
    const splashColors = [
      new THREE.Color(0x88CCDD),  // Water blue
      new THREE.Color(0xAADDEE),  // Light water blue
      new THREE.Color(0xFFFFFF),  // White foam
    ];

    for (let i = 0; i < count; i++) {
      // Start at splash point
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

      // Assign random splash color
      const color = splashColors[Math.floor(Math.random() * splashColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Spray upward and outward
      const angle = Math.random() * Math.PI * 2;
      const outwardSpeed = (Math.random() * 2 + 1) * intensity;
      const upwardSpeed = (Math.random() * 4 + 3) * intensity;

      velocities[i * 3] = Math.cos(angle) * outwardSpeed;
      velocities[i * 3 + 1] = upwardSpeed;
      velocities[i * 3 + 2] = Math.sin(angle) * outwardSpeed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15 * Math.min(intensity + 0.5, 1.5),
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    // Lifetime 0.4-0.6s based on intensity
    const maxLife = 0.4 + Math.min(intensity, 1) * 0.2;

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife,
      isLooping: false,
      elapsed: 0
      // Note: gravity is applied by default (no noGravity flag)
    });
  }

  // Speed boost trail throttling
  private lastSpeedBoostTrailTime: number = 0;
  private speedBoostTrailInterval: number = 0.05;  // 50ms between trail spawns

  /**
   * Speed boost trail - directional particles streaming behind player
   * Gold/yellow particles matching speed boost pad colors
   * @param position - Player position
   * @param direction - Boost direction (particles stream opposite)
   */
  createSpeedBoostTrail(position: THREE.Vector3, direction: THREE.Vector3): void {
    const now = performance.now() / 1000;
    if (now - this.lastSpeedBoostTrailTime < this.speedBoostTrailInterval) return;
    this.lastSpeedBoostTrailTime = now;

    const count = 7;  // 6-8 particles per call

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Speed boost color palette (gold/yellow)
    const trailColors = [
      new THREE.Color(0xFFD700),  // Gold
      new THREE.Color(0xFFAA33),  // Orange-gold
    ];

    // Normalize direction for positioning
    const dir = direction.clone().normalize();

    for (let i = 0; i < count; i++) {
      // Position particles behind player (opposite of boost direction)
      // Spread slightly for visual interest
      const offset = (Math.random() * 0.5 + 0.3);  // Slight offset behind
      const spread = (Math.random() - 0.5) * 0.4;  // Lateral spread

      // Perpendicular vector for spread
      const perpX = -dir.z;
      const perpZ = dir.x;

      positions[i * 3] = position.x - dir.x * offset + perpX * spread;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = position.z - dir.z * offset + perpZ * spread;

      // Assign alternating gold colors
      const color = trailColors[i % 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Particles drift backward (opposite of boost direction) with slight spread
      const driftSpeed = Math.random() * 2 + 1;
      velocities[i * 3] = -dir.x * driftSpeed + (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = Math.random() * 0.3;  // Slight upward float
      velocities[i * 3 + 2] = -dir.z * driftSpeed + (Math.random() - 0.5) * 0.5;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.175,  // Short lifetime (0.15-0.2s range)
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Trail particles float, don't fall
    });
  }

  /**
   * NPC proximity glow - subtle sparkles when player can talk to NPC
   * Call periodically (every 0.5s) when player is within talk range
   */
  createNPCProximityGlow(position: THREE.Vector3): void {
    const count = 4;  // 3-4 small sparkle particles

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Soft white/gold color palette
    const glowColors = [
      new THREE.Color(0xFFFFDD),  // Soft white
      new THREE.Color(0xFFEEBB),  // Soft gold
    ];

    for (let i = 0; i < count; i++) {
      // Start around NPC position with slight random offset
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5 + 0.3;
      positions[i * 3] = position.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = position.y + Math.random() * 0.5 + 0.5;  // Mid-body height
      positions[i * 3 + 2] = position.z + Math.sin(angle) * radius;

      // Assign alternating colors
      const color = glowColors[i % 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Gentle upward float with slight horizontal drift
      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = Math.random() * 0.8 + 0.4;  // Upward
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.3,  // Short lifetime (0.3s)
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Sparkles float, don't fall
    });
  }

  // Magnet trail throttling
  private lastMagnetTrailTime: number = 0;
  private magnetTrailInterval: number = 0.08;  // 80ms between trail spawns

  // Swimming bubbles throttling
  private lastSwimmingBubblesTime: number = 0;
  private swimmingBubblesInterval: number = 0.2;  // 200ms between bubble spawns

  // Ambient dust throttling
  private lastAmbientDustTime: number = 0;
  private ambientDustInterval: number = 0.7;  // 700ms between dust spawns

  /**
   * Subtle sparkle trail for collectible magnet effect
   * Small particles that drift behind the collectible as it moves toward player
   */
  createMagnetTrail(position: THREE.Vector3, direction: THREE.Vector3): void {
    const now = performance.now() / 1000;
    if (now - this.lastMagnetTrailTime < this.magnetTrailInterval) return;
    this.lastMagnetTrailTime = now;

    const count = 3;  // Small number of particles

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Sparkle color palette (gold/yellow to match collectibles)
    const sparkleColors = [
      new THREE.Color(0xFFD700),  // Gold
      new THREE.Color(0xFFEE88),  // Light gold
      new THREE.Color(0xFFFFAA),  // Pale yellow
    ];

    for (let i = 0; i < count; i++) {
      // Start slightly behind the collectible (opposite of direction)
      const offset = (Math.random() * 0.3 + 0.1);
      positions[i * 3] = position.x - direction.x * offset + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 2] = position.z - direction.z * offset + (Math.random() - 0.5) * 0.2;

      // Assign random sparkle color
      const color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Particles drift backward (opposite of movement) with slight spread
      const driftSpeed = Math.random() * 0.5 + 0.3;
      velocities[i * 3] = -direction.x * driftSpeed + (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = Math.random() * 0.4;  // Slight upward float
      velocities[i * 3 + 2] = -direction.z * driftSpeed + (Math.random() - 0.5) * 0.3;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.25,  // Short lifetime
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Trail particles float, don't fall
    });
  }

  /**
   * Ambient floating dust mote particles - atmospheric depth effect
   * Very small, slow-moving particles in light colors
   * @param position - Center position to spawn dust around (usually player position)
   */
  createAmbientDust(position: THREE.Vector3): void {
    const now = performance.now() / 1000;
    if (now - this.lastAmbientDustTime < this.ambientDustInterval) return;
    this.lastAmbientDustTime = now;

    const count = 2 + Math.floor(Math.random() * 2);  // 2-3 particles per spawn

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Light dust mote color palette (white, cream, pale yellow)
    const dustColors = [
      new THREE.Color(0xFFFFFF),  // White
      new THREE.Color(0xFFFDD0),  // Cream
      new THREE.Color(0xFFFACD),  // Lemon chiffon (pale yellow)
    ];

    for (let i = 0; i < count; i++) {
      // Spawn in a sphere around the position (5-10 units radius)
      const radius = 5 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = position.x + Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = position.y + Math.cos(phi) * radius * 0.5 + Math.random() * 3;  // Bias toward player height
      positions[i * 3 + 2] = position.z + Math.sin(phi) * Math.sin(theta) * radius;

      // Assign random dust color
      const color = dustColors[Math.floor(Math.random() * dustColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Very slow, gentle drift with slight upward float
      const driftSpeed = Math.random() * 0.3 + 0.1;
      const driftAngle = Math.random() * Math.PI * 2;

      velocities[i * 3] = Math.cos(driftAngle) * driftSpeed;
      velocities[i * 3 + 1] = Math.random() * 0.2 + 0.1;  // Gentle upward float
      velocities[i * 3 + 2] = Math.sin(driftAngle) * driftSpeed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.04,  // Very small particles
      transparent: true,
      opacity: 0.3,  // Low opacity (0.2-0.4 range)
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 4.0,  // Long lifetime (3-5 seconds range)
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Dust motes float, don't fall
    });
  }

  /**
   * Quest complete celebration burst - large colorful fanfare
   * Gold, green, white particles in upward spray pattern
   */
  createQuestCompleteBurst(position: THREE.Vector3): void {
    const count = 60;  // Large burst of 50+ particles

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Celebration color palette (gold, green, white)
    const celebrationColors = [
      new THREE.Color(0xFFD700),  // Gold
      new THREE.Color(0xFFAA33),  // Orange-gold
      new THREE.Color(0x7CB342),  // Green
      new THREE.Color(0x8BC34A),  // Light green
      new THREE.Color(0xFFFFFF),  // White
      new THREE.Color(0xFFF8E1),  // Cream white
    ];

    for (let i = 0; i < count; i++) {
      // Start at celebration point
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

      // Assign random celebration color
      const color = celebrationColors[Math.floor(Math.random() * celebrationColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Upward spray pattern with outward spread
      const angle = Math.random() * Math.PI * 2;
      const outwardSpeed = Math.random() * 3 + 1;
      const upwardSpeed = Math.random() * 6 + 4;  // Strong upward bias

      velocities[i * 3] = Math.cos(angle) * outwardSpeed;
      velocities[i * 3 + 1] = upwardSpeed;
      velocities[i * 3 + 2] = Math.sin(angle) * outwardSpeed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 1.0,  // Longer lifetime (1s)
      isLooping: false,
      elapsed: 0
      // Note: gravity is applied by default for natural arc
    });
  }

  /**
   * Death effect - dark particles dispersing from death location
   * Grey particles that fade and spread outward
   */
  createDeathEffect(position: THREE.Vector3): void {
    const count = 18;  // 15-20 particles

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Dark/grey color palette
    const deathColors = [
      new THREE.Color(0x333333),  // Dark grey
      new THREE.Color(0x666666),  // Medium grey
      new THREE.Color(0x444444),  // Mid-dark grey
    ];

    for (let i = 0; i < count; i++) {
      // Start at death position
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;

      // Assign random grey color
      const color = deathColors[Math.floor(Math.random() * deathColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Disperse outward in all directions
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;  // Bias slightly downward
      const speed = Math.random() * 3 + 2;

      velocities[i * 3] = Math.cos(angle) * Math.cos(elevation) * speed;
      velocities[i * 3 + 1] = Math.sin(elevation) * speed;
      velocities[i * 3 + 2] = Math.sin(angle) * Math.cos(elevation) * speed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.NormalBlending,  // Normal blending for dark particles
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.5,  // Quick fade
      isLooping: false,
      elapsed: 0
      // Gravity applied by default for falling debris feel
    });
  }

  /**
   * Respawn effect - golden/white particles spiraling inward to spawn point
   * Magical coalescing effect for player reappearance
   */
  createRespawnEffect(position: THREE.Vector3): void {
    const spiralCount = 20;  // Spiral inward particles
    const sparkleCount = 15;  // Central sparkle burst
    const totalCount = spiralCount + sparkleCount;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const velocities = new Float32Array(totalCount * 3);
    const lifetimes = new Float32Array(totalCount);

    // Golden/white color palette
    const respawnColors = [
      new THREE.Color(0xFFD700),  // Gold
      new THREE.Color(0xFFFFFF),  // White
      new THREE.Color(0xFFEE88),  // Light gold
    ];

    // Create spiral inward particles
    for (let i = 0; i < spiralCount; i++) {
      // Start in a ring around respawn point
      const angle = (i / spiralCount) * Math.PI * 2;
      const startRadius = 2.5 + Math.random() * 0.5;  // Start 2.5-3 units out

      positions[i * 3] = position.x + Math.cos(angle) * startRadius;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.3) * 1.5;  // Varied heights
      positions[i * 3 + 2] = position.z + Math.sin(angle) * startRadius;

      // Assign random color
      const color = respawnColors[Math.floor(Math.random() * respawnColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Spiral inward - move toward center with perpendicular spin
      const inwardSpeed = 4 + Math.random() * 2;
      const spinSpeed = 2;  // Perpendicular velocity for spiral motion

      // Inward velocity + perpendicular spin component
      velocities[i * 3] = -Math.cos(angle) * inwardSpeed + Math.sin(angle) * spinSpeed;
      velocities[i * 3 + 1] = Math.random() * 0.5;  // Slight upward drift
      velocities[i * 3 + 2] = -Math.sin(angle) * inwardSpeed - Math.cos(angle) * spinSpeed;

      lifetimes[i] = 1.0;
    }

    // Create central sparkle burst (appears as particles coalesce)
    for (let i = spiralCount; i < totalCount; i++) {
      // Start at center of respawn point
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;

      // More whites for central sparkles
      const color = respawnColors[Math.floor(Math.random() * respawnColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Gentle upward burst with slight spread
      const angle = Math.random() * Math.PI * 2;
      const spreadSpeed = Math.random() * 1.5;
      const upwardSpeed = Math.random() * 3 + 2;

      velocities[i * 3] = Math.cos(angle) * spreadSpeed;
      velocities[i * 3 + 1] = upwardSpeed;
      velocities[i * 3 + 2] = Math.sin(angle) * spreadSpeed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.6,  // 0.5-0.7s lifetime
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Sparkles float, spiral moves without gravity
    });
  }

  /**
   * Ledge grab shimmer - soft golden sparkles at grab point
   * Delicate, floating particles for visual feedback
   */
  createLedgeGrabShimmer(position: THREE.Vector3): void {
    const count = 8;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Soft golden sparkle palette
    const shimmerColors = [
      new THREE.Color(0xFFD700),  // Gold
      new THREE.Color(0xFFFACD),  // Lemon chiffon
      new THREE.Color(0xFFF8DC),  // Cornsilk
    ];

    for (let i = 0; i < count; i++) {
      // Start at grab point with slight random offset
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;

      // Assign random shimmer color
      const color = shimmerColors[Math.floor(Math.random() * shimmerColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Gentle upward float with slight spread
      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = Math.random() * 0.8 + 0.3;  // Upward bias
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.5,  // 0.5 second duration
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Shimmer floats gently upward
    });
  }

  /**
   * Bounce pad effect - ring of particles expanding outward at ground level
   * Cyan/white colors for spring/bouncy feel
   */
  createBouncePadEffect(position: THREE.Vector3): void {
    const count = 18;  // 15-20 particles in a ring

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Spring/bouncy color palette (cyan to white)
    const bounceColors = [
      new THREE.Color(0x00FFFF),  // Cyan
      new THREE.Color(0x88FFFF),  // Light cyan
      new THREE.Color(0xFFFFFF),  // White
    ];

    for (let i = 0; i < count; i++) {
      // Start at bounce point (at ground level)
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y - 0.3;  // Slightly below player feet
      positions[i * 3 + 2] = position.z;

      // Assign random bounce color
      const color = bounceColors[Math.floor(Math.random() * bounceColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Expand outward in a ring with slight upward motion
      const angle = (i / count) * Math.PI * 2;
      const speed = 5 + Math.random() * 2;  // Fast outward expansion

      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.random() * 2 + 1;  // Slight upward motion
      velocities[i * 3 + 2] = Math.sin(angle) * speed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.25,  // Quick effect (0.25s)
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Ring stays at ground level
    });
  }

  /**
   * Collect trail - particles arc upward toward top-left of screen (UI counter location)
   * Called when collecting stars/cards to visually connect pickup to HUD
   * @param startPos - World position where collectible was picked up
   * @param color - Particle color matching collectible type (gold for stars, red for cards)
   */
  createCollectTrail(startPos: THREE.Vector3, color: number): void {
    const count = 6;  // 5-6 particles

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Start at collection position with slight spread
      positions[i * 3] = startPos.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = startPos.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = startPos.z + (Math.random() - 0.5) * 0.3;

      // Arc toward top-left of screen (UI counter)
      // Combine upward velocity with leftward velocity for arc
      // Stagger velocities for spread effect
      const stagger = 0.8 + (i / count) * 0.4;  // 0.8 to 1.2 multiplier
      velocities[i * 3] = (-2 + Math.random() * 0.5) * stagger;  // Leftward
      velocities[i * 3 + 1] = (8 + Math.random() * 2) * stagger;  // Upward (strong)
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;  // Slight z variance

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: 0.2,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.6,  // 0.6 second duration
      isLooping: false,
      elapsed: 0,
      noGravity: true  // Arc upward without falling back down
    });
  }

  // Crumble particle throttling
  private lastCrumbleTime: number = 0;
  private crumbleInterval: number = 0.1;  // 100ms between crumble spawns

  /**
   * Crumble particle effect for breakable platforms
   * Small brown/gray rubble particles that fall from the platform
   * @param position - Platform center position
   * @param intensity - 0-1 how close to breaking (affects particle count and speed)
   */
  createCrumbleParticles(position: THREE.Vector3, intensity: number = 0.5): void {
    const now = performance.now() / 1000;
    // Throttle based on intensity - more particles allowed at higher intensity
    const adjustedInterval = this.crumbleInterval * (1.5 - intensity);
    if (now - this.lastCrumbleTime < adjustedInterval) return;
    this.lastCrumbleTime = now;

    // Scale particle count with intensity (3-8 particles)
    const count = Math.floor(3 + intensity * 5);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Rubble color palette (brown/gray stones)
    const rubbleColors = [
      new THREE.Color(0x8B7355),  // Brown
      new THREE.Color(0x696969),  // Dim gray
      new THREE.Color(0xA0826D),  // Tan brown
      new THREE.Color(0x808080),  // Gray
    ];

    for (let i = 0; i < count; i++) {
      // Start around platform surface with random spread
      positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = position.y + Math.random() * 0.2;  // Near top surface
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;

      // Assign random rubble color
      const color = rubbleColors[Math.floor(Math.random() * rubbleColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Particles fall downward with slight outward spread
      // Higher intensity = faster falling, more spread
      const spreadSpeed = (Math.random() * 0.5 + 0.2) * (1 + intensity);
      const angle = Math.random() * Math.PI * 2;

      velocities[i * 3] = Math.cos(angle) * spreadSpeed;
      velocities[i * 3 + 1] = -Math.random() * (1 + intensity * 2);  // Downward
      velocities[i * 3 + 2] = Math.sin(angle) * spreadSpeed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08 + intensity * 0.04,  // Slightly larger at high intensity
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.4 + intensity * 0.2,  // Longer life at high intensity
      isLooping: false,
      elapsed: 0
      // Note: gravity is applied by default (no noGravity flag)
    });
  }

  /**
   * Gate unlock effect
   */
  createGateUnlockEffect(position: THREE.Vector3): void {
    const count = 50;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Start in a ring around the gate
      const angle = (i / count) * Math.PI * 2;
      const radius = 2;

      positions[i * 3] = position.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = position.y + Math.random() * 4;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * radius;

      // Spiral inward and upward
      velocities[i * 3] = -Math.cos(angle) * 0.5;
      velocities[i * 3 + 1] = Math.random() * 2 + 1;
      velocities[i * 3 + 2] = -Math.sin(angle) * 0.5;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.4,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 1.5,
      isLooping: false,
      elapsed: 0
    });
  }

  /**
   * Gate enter celebration - triumphant spiral burst of golden particles with confetti
   * Victory moment when player enters the unlocked gate to complete the level
   */
  createGateEnterCelebration(position: THREE.Vector3): void {
    const count = 30;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Golden celebration color palette with subtle confetti accents
    const celebrationColors = [
      new THREE.Color(0xFFD700),  // Gold (primary)
      new THREE.Color(0xFFA500),  // Orange gold (primary)
      new THREE.Color(0xFFEE88),  // Light gold
      new THREE.Color(0xFF69B4),  // Hot pink (confetti)
      new THREE.Color(0x00CED1),  // Dark cyan (confetti)
      new THREE.Color(0x98FB98),  // Pale green (confetti)
    ];

    for (let i = 0; i < count; i++) {
      // Start at player position (gate center)
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = position.y + Math.random() * 0.5;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

      // Assign random celebration color
      const color = celebrationColors[Math.floor(Math.random() * celebrationColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Spiral burst pattern - outward with strong upward motion
      const angle = (i / count) * Math.PI * 4 + Math.random() * 0.5;  // Two full spirals
      const heightPhase = i / count;  // Different heights in spiral
      const outwardSpeed = Math.random() * 3 + 2;
      const upwardSpeed = Math.random() * 5 + 4 + heightPhase * 3;  // Higher particles go faster up

      // Add spiral rotation to velocity
      const spiralOffset = Math.PI * 0.5;  // Perpendicular to outward direction
      velocities[i * 3] = Math.cos(angle) * outwardSpeed + Math.cos(angle + spiralOffset) * 1.5;
      velocities[i * 3 + 1] = upwardSpeed;
      velocities[i * 3 + 2] = Math.sin(angle) * outwardSpeed + Math.sin(angle + spiralOffset) * 1.5;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 1.2,  // Triumphant but not too long
      isLooping: false,
      elapsed: 0
      // Note: gravity applied by default for natural arcing motion
    });
  }

  /**
   * Update all particle systems
   */
  update(dt: number, playerPosition: THREE.Vector3): void {
    // Update ambient particles
    this.updateAmbientParticles(dt, playerPosition);

    // Update rose petals
    this.updateRosePetals(dt);

    // Evict oldest systems if over cap
    while (this.systems.length > ParticleManager.MAX_SYSTEMS) {
      const oldest = this.systems.shift()!;
      if (oldest.pooled) {
        this.releaseSystem(oldest);
      } else {
        this.scene.remove(oldest.points);
        oldest.points.geometry.dispose();
        (oldest.points.material as THREE.Material).dispose();
      }
    }

    // Update burst systems
    const toRemove: number[] = [];

    for (let i = 0; i < this.systems.length; i++) {
      const system = this.systems[i];
      system.elapsed += dt;

      if (system.elapsed >= system.maxLife) {
        toRemove.push(i);
        continue;
      }

      const positions = system.points.geometry.attributes.position;
      const arr = positions.array as Float32Array;
      const count = positions.count;

      // Update positions based on velocity
      for (let j = 0; j < count; j++) {
        arr[j * 3] += system.velocities[j * 3] * dt;
        arr[j * 3 + 1] += system.velocities[j * 3 + 1] * dt;
        arr[j * 3 + 2] += system.velocities[j * 3 + 2] * dt;

        // Apply gravity (unless disabled for this system)
        if (!system.noGravity) {
          system.velocities[j * 3 + 1] -= dt * 5;
        }

        // Update lifetime for fading
        system.lifetimes[j] -= dt / system.maxLife;
      }

      positions.needsUpdate = true;

      // Fade out
      const material = system.points.material as THREE.PointsMaterial;
      material.opacity = 1 - (system.elapsed / system.maxLife);
    }

    // Remove completed systems (return pooled ones, dispose non-pooled)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const index = toRemove[i];
      const system = this.systems[index];
      if (system.pooled) {
        this.releaseSystem(system);
      } else {
        this.scene.remove(system.points);
        system.points.geometry.dispose();
        (system.points.material as THREE.Material).dispose();
      }
      this.systems.splice(index, 1);
    }
  }

  /**
   * Set ambient particle color (for atmosphere changes)
   */
  setAmbientColor(color: number): void {
    if (this.ambientParticles) {
      (this.ambientParticles.material as THREE.PointsMaterial).color.set(color);
    }
  }

  /**
   * Create rose petal emitter for Queen's Garden
   * Pink/red petals that drift slowly with wind simulation
   */
  createRosePetals(bounds: THREE.Box3, count: number = 80): void {
    // Clean up existing
    if (this.rosePetals) {
      this.scene.remove(this.rosePetals.points);
      this.rosePetals.points.geometry.dispose();
      (this.rosePetals.points.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    const size = new THREE.Vector3();
    bounds.getSize(size);
    const center = new THREE.Vector3();
    bounds.getCenter(center);

    // Petal color palette (pink to red variations)
    const petalColors = [
      new THREE.Color(0xFF69B4), // Hot pink
      new THREE.Color(0xFFB6C1), // Light pink
      new THREE.Color(0xC41E3A), // Cardinal red
      new THREE.Color(0xFF1493), // Deep pink
      new THREE.Color(0xDB7093), // Pale violet red
    ];

    for (let i = 0; i < count; i++) {
      // Random position within bounds
      positions[i * 3] = center.x + (Math.random() - 0.5) * size.x;
      positions[i * 3 + 1] = center.y + Math.random() * size.y;
      positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z;

      // Random petal color
      const color = petalColors[Math.floor(Math.random() * petalColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Random size for variety
      sizes[i] = Math.random() * 0.15 + 0.1;

      // Initial velocity (gentle downward drift with slight horizontal)
      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = -Math.random() * 0.8 - 0.2; // Downward
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.rosePetals = { points, velocities, bounds };
  }

  /**
   * Update rose petals with wind simulation
   */
  private updateRosePetals(dt: number, windDirection?: THREE.Vector3): void {
    if (!this.rosePetals) return;
    const wind = windDirection ?? this.defaultWindDirection;

    const positions = this.rosePetals.points.geometry.attributes.position;
    const arr = positions.array as Float32Array;
    const count = positions.count;
    const bounds = this.rosePetals.bounds;
    const velocities = this.rosePetals.velocities;

    bounds.getSize(this.roseSizeCache);
    bounds.getCenter(this.roseCenterCache);
    const size = this.roseSizeCache;
    const center = this.roseCenterCache;

    for (let i = 0; i < count; i++) {
      // Add wind influence with slight turbulence
      const turbulence = Math.sin(arr[i * 3] * 0.5 + arr[i * 3 + 1] * 0.3) * 0.1;

      // Update velocity with wind
      velocities[i * 3] += wind.x * dt + turbulence * dt;
      velocities[i * 3 + 2] += wind.z * dt + turbulence * dt;

      // Apply velocity
      arr[i * 3] += velocities[i * 3] * dt;
      arr[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      arr[i * 3 + 2] += velocities[i * 3 + 2] * dt;

      // Slight swaying motion
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 2 + i) * dt * 0.3;

      // Reset if below bounds or drifted too far
      if (arr[i * 3 + 1] < bounds.min.y ||
          arr[i * 3] < bounds.min.x - 5 || arr[i * 3] > bounds.max.x + 5 ||
          arr[i * 3 + 2] < bounds.min.z - 5 || arr[i * 3 + 2] > bounds.max.z + 5) {
        // Respawn at top of bounds
        arr[i * 3] = center.x + (Math.random() - 0.5) * size.x;
        arr[i * 3 + 1] = bounds.max.y + Math.random() * 2;
        arr[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z;

        // Reset velocity
        velocities[i * 3] = (Math.random() - 0.5) * 0.5;
        velocities[i * 3 + 1] = -Math.random() * 0.8 - 0.2;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      }

      // Dampen horizontal velocity
      velocities[i * 3] *= 0.99;
      velocities[i * 3 + 2] *= 0.99;
    }

    positions.needsUpdate = true;
  }

  /**
   * Stop rose petal effect
   */
  stopRosePetals(): void {
    if (this.rosePetals) {
      this.scene.remove(this.rosePetals.points);
      this.rosePetals.points.geometry.dispose();
      (this.rosePetals.points.material as THREE.Material).dispose();
      this.rosePetals = null;
    }
  }

  /**
   * Clean up all particles
   */
  dispose(): void {
    if (this.ambientParticles) {
      this.scene.remove(this.ambientParticles);
      this.ambientParticles.geometry.dispose();
      (this.ambientParticles.material as THREE.Material).dispose();
      this.ambientParticles = null;
    }

    // Clean up rose petals
    this.stopRosePetals();

    for (const system of this.systems) {
      this.scene.remove(system.points);
      system.points.geometry.dispose();
      (system.points.material as THREE.Material).dispose();
    }
    this.systems = [];

    // Dispose pool
    for (const system of this.pool) {
      this.scene.remove(system.points);
      system.points.geometry.dispose();
      (system.points.material as THREE.Material).dispose();
    }
    this.pool = [];
  }
}
