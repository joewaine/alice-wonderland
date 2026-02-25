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
}

export class ParticleManager {
  private scene: THREE.Scene;
  private systems: ParticleSystem[] = [];

  // Ambient particles
  private ambientParticles: THREE.Points | null = null;

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

        // Apply gravity
        system.velocities[j * 3 + 1] -= dt * 5;

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
   * Clean up all particles
   */
  dispose(): void {
    if (this.ambientParticles) {
      this.scene.remove(this.ambientParticles);
      this.ambientParticles.geometry.dispose();
      (this.ambientParticles.material as THREE.Material).dispose();
      this.ambientParticles = null;
    }

    for (const system of this.systems) {
      this.scene.remove(system.points);
      system.points.geometry.dispose();
      (system.points.material as THREE.Material).dispose();
    }
    this.systems = [];
  }
}
