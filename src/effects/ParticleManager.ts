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
}

export class ParticleManager {
  private scene: THREE.Scene;
  private systems: ParticleSystem[] = [];

  // Ambient particles
  private ambientParticles: THREE.Points | null = null;

  // Rose petal system (for Queen's Garden)
  private rosePetals: {
    points: THREE.Points;
    velocities: Float32Array;
    bounds: THREE.Box3;
  } | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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
   */
  createSizeChangeBurst(
    position: THREE.Vector3,
    type: 'shrink' | 'grow'
  ): void {
    const color = type === 'shrink' ? 0xff69b4 : 0x9370db; // Pink for shrink, purple for grow
    const count = 30;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Burst direction
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      const upward = type === 'grow' ? Math.random() * 2 : -Math.random() * 2;

      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = upward + Math.random();
      velocities[i * 3 + 2] = Math.sin(angle) * speed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: 0.3,
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
      maxLife: 1.0,
      isLooping: false,
      elapsed: 0
    });
  }

  /**
   * Sparkle burst for collectible pickup
   */
  createCollectBurst(position: THREE.Vector3, color: number = 0xffd700): void {
    const count = 20;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Upward burst
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;

      velocities[i * 3] = Math.cos(angle) * speed * 0.5;
      velocities[i * 3 + 1] = Math.random() * 3 + 2;
      velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.5;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: 0.25,
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
      maxLife: 0.8,
      isLooping: false,
      elapsed: 0
    });
  }

  /**
   * Landing dust effect
   */
  createLandingDust(position: THREE.Vector3, intensity: number = 1): void {
    const count = Math.floor(15 * intensity);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Start at ground level
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y - 0.5;
      positions[i * 3 + 2] = position.z;

      // Spread outward along ground
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;

      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.random() * 1.5; // Slight upward
      velocities[i * 3 + 2] = Math.sin(angle) * speed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xccbb99, // Dusty tan color
      size: 0.2,
      transparent: true,
      opacity: 0.7,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.5,
      isLooping: false,
      elapsed: 0
    });
  }

  // Footstep dust throttling
  private lastFootstepTime: number = 0;
  private footstepInterval: number = 0.2;  // Seconds between footstep particles

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

    const count = 4;  // Small number of particles

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Start at feet level
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = position.y - 0.8;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;

      // Small outward puff
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.5 + 0.2;

      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.random() * 0.5 + 0.2;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xd4c4a8,  // Light dusty tan
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.systems.push({
      points,
      velocities,
      lifetimes,
      maxLife: 0.3,  // Quick fade
      isLooping: false,
      elapsed: 0
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
    const count = 4;  // 3-5 small particles per call

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    // Stone/dust color palette (matches stone path colors)
    const dustColors = [
      new THREE.Color(0xD2B48C),  // Tan
      new THREE.Color(0xC4A882),  // Darker tan
    ];

    for (let i = 0; i < count; i++) {
      // Start at wall contact point with slight random offset
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.2;

      // Assign alternating dust colors
      const color = dustColors[i % 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Drift away from wall using wallNormal, plus slight random spread
      const driftSpeed = Math.random() * 1.5 + 0.5;
      velocities[i * 3] = wallNormal.x * driftSpeed + (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = Math.random() * 0.3 - 0.1;  // Slight up/down
      velocities[i * 3 + 2] = wallNormal.z * driftSpeed + (Math.random() - 0.5) * 0.5;

      lifetimes[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,  // Small particles
      transparent: true,
      opacity: 0.6,
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
      maxLife: 0.2,  // Very short lifetime (0.15-0.25s)
      isLooping: false,
      elapsed: 0
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
   * Update all particle systems
   */
  update(dt: number, playerPosition: THREE.Vector3): void {
    // Update ambient particles
    this.updateAmbientParticles(dt, playerPosition);

    // Update rose petals
    this.updateRosePetals(dt);

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

    // Remove completed systems
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const index = toRemove[i];
      const system = this.systems[index];
      this.scene.remove(system.points);
      system.points.geometry.dispose();
      (system.points.material as THREE.Material).dispose();
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
  private updateRosePetals(dt: number, windDirection: THREE.Vector3 = new THREE.Vector3(0.3, 0, 0.1)): void {
    if (!this.rosePetals) return;

    const positions = this.rosePetals.points.geometry.attributes.position;
    const arr = positions.array as Float32Array;
    const count = positions.count;
    const bounds = this.rosePetals.bounds;
    const velocities = this.rosePetals.velocities;

    const size = new THREE.Vector3();
    bounds.getSize(size);
    const center = new THREE.Vector3();
    bounds.getCenter(center);

    for (let i = 0; i < count; i++) {
      // Add wind influence with slight turbulence
      const turbulence = Math.sin(arr[i * 3] * 0.5 + arr[i * 3 + 1] * 0.3) * 0.1;

      // Update velocity with wind
      velocities[i * 3] += windDirection.x * dt + turbulence * dt;
      velocities[i * 3 + 2] += windDirection.z * dt + turbulence * dt;

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
  }
}
