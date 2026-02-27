/**
 * FoliageAnimator - Adds wind sway animation to garden foliage
 *
 * Creates gentle swaying motion for hedges, rose bushes, and topiaries
 * to make the garden feel alive and atmospheric.
 */

import * as THREE from 'three';

interface FoliageObject {
  mesh: THREE.Object3D;
  baseRotation: THREE.Euler;
  swayAmount: number;
  swaySpeed: number;
  phase: number;
}

export class FoliageAnimator {
  private foliageObjects: FoliageObject[] = [];
  private time: number = 0;
  private windDirection: THREE.Vector2 = new THREE.Vector2(1, 0.3);
  private windStrength: number = 1.0;

  /**
   * Register a mesh for wind animation
   */
  addFoliage(
    mesh: THREE.Object3D,
    options: {
      swayAmount?: number;  // Max rotation in radians
      swaySpeed?: number;   // Oscillation speed
    } = {}
  ): void {
    const swayAmount = options.swayAmount ?? 0.03;
    const swaySpeed = options.swaySpeed ?? 1.5;

    this.foliageObjects.push({
      mesh,
      baseRotation: mesh.rotation.clone(),
      swayAmount,
      swaySpeed,
      phase: Math.random() * Math.PI * 2,  // Random phase for variety
    });
  }

  /**
   * Register multiple meshes at once
   */
  addFoliageGroup(meshes: THREE.Object3D[], options?: { swayAmount?: number; swaySpeed?: number }): void {
    for (const mesh of meshes) {
      this.addFoliage(mesh, options);
    }
  }

  /**
   * Set wind parameters
   */
  setWind(direction: THREE.Vector2, strength: number): void {
    this.windDirection.copy(direction).normalize();
    this.windStrength = strength;
  }

  /**
   * Update all foliage animations
   */
  update(dt: number): void {
    this.time += dt;

    for (const foliage of this.foliageObjects) {
      // Calculate sway based on time and wind
      const sway = Math.sin(this.time * foliage.swaySpeed + foliage.phase) * foliage.swayAmount * this.windStrength;
      const secondarySway = Math.sin(this.time * foliage.swaySpeed * 0.7 + foliage.phase + 1.5) * foliage.swayAmount * 0.3 * this.windStrength;

      // Apply rotation on X and Z axes based on wind direction
      foliage.mesh.rotation.x = foliage.baseRotation.x + sway * this.windDirection.y;
      foliage.mesh.rotation.z = foliage.baseRotation.z + sway * this.windDirection.x + secondarySway;
    }
  }

  /**
   * Remove a mesh from animation
   */
  removeFoliage(mesh: THREE.Object3D): void {
    const index = this.foliageObjects.findIndex(f => f.mesh === mesh);
    if (index > -1) {
      // Reset to base rotation
      const foliage = this.foliageObjects[index];
      foliage.mesh.rotation.copy(foliage.baseRotation);
      this.foliageObjects.splice(index, 1);
    }
  }

  /**
   * Clear all foliage
   */
  clear(): void {
    // Reset all rotations
    for (const foliage of this.foliageObjects) {
      foliage.mesh.rotation.copy(foliage.baseRotation);
    }
    this.foliageObjects = [];
  }

  /**
   * Get count of animated objects
   */
  getCount(): number {
    return this.foliageObjects.length;
  }
}
