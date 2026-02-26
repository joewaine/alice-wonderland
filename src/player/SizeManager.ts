/**
 * SizeManager - Handles Alice's size changing mechanic
 *
 * Alice can shrink or grow by collecting mushrooms/potions.
 * Size affects both visual appearance and physics collision.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export type SizeState = 'small' | 'normal' | 'large';

interface SizeConfig {
  scale: number;       // Visual scale multiplier
  capsuleHeight: number;  // Physics capsule half-height
  capsuleRadius: number;  // Physics capsule radius
  eyeHeight: number;   // Camera height offset
  jumpForce: number;   // Jump force multiplier
  moveSpeed: number;   // Movement speed multiplier
}

const SIZE_CONFIGS: Record<SizeState, SizeConfig> = {
  small: {
    scale: 0.3,
    capsuleHeight: 0.15,
    capsuleRadius: 0.12,
    eyeHeight: 0.25,
    jumpForce: 8,      // Lower jump when small
    moveSpeed: 6       // Slightly slower
  },
  normal: {
    scale: 1.0,
    capsuleHeight: 0.5,
    capsuleRadius: 0.4,
    eyeHeight: 0.7,
    jumpForce: 12,
    moveSpeed: 8
  },
  large: {
    scale: 2.5,
    capsuleHeight: 1.25,
    capsuleRadius: 1.0,
    eyeHeight: 1.75,
    jumpForce: 15,     // Higher jump when large
    moveSpeed: 10      // Faster movement
  }
};

export class SizeManager {
  private currentSize: SizeState = 'normal';
  private world: RAPIER.World;
  private playerBody: RAPIER.RigidBody;
  private playerMesh: THREE.Object3D | null = null;

  // Callback for when size changes (used by Game to update camera height, etc.)
  public onSizeChange: ((size: SizeState, config: SizeConfig) => void) | null = null;

  constructor(world: RAPIER.World, playerBody: RAPIER.RigidBody) {
    this.world = world;
    this.playerBody = playerBody;
  }

  /**
   * Set the player mesh for visual scaling
   */
  setPlayerMesh(mesh: THREE.Object3D): void {
    this.playerMesh = mesh;
  }

  /**
   * Get current size state
   */
  get size(): SizeState {
    return this.currentSize;
  }

  /**
   * Get current size configuration
   */
  get config(): SizeConfig {
    return SIZE_CONFIGS[this.currentSize];
  }

  /**
   * Get current size state
   */
  getCurrentSize(): SizeState {
    return this.currentSize;
  }

  /**
   * Change to a new size
   */
  changeSize(newSize: SizeState): void {
    if (newSize === this.currentSize) return;

    console.log(`Size changing: ${this.currentSize} → ${newSize}`);

    const oldConfig = SIZE_CONFIGS[this.currentSize];
    const newConfig = SIZE_CONFIGS[newSize];

    this.currentSize = newSize;

    // Update visual scale
    if (this.playerMesh) {
      this.playerMesh.scale.setScalar(newConfig.scale);
    }

    // Update physics collider
    this.updateCollider(newConfig);

    // Adjust position to prevent clipping into ground
    const pos = this.playerBody.translation();
    const heightDiff = newConfig.capsuleHeight - oldConfig.capsuleHeight;
    if (heightDiff > 0) {
      // Growing - lift up
      this.playerBody.setTranslation(
        new RAPIER.Vector3(pos.x, pos.y + heightDiff * 2, pos.z),
        true
      );
    }

    // Notify listeners
    if (this.onSizeChange) {
      this.onSizeChange(newSize, newConfig);
    }

    // Visual feedback
    this.playTransitionEffect(newSize);
  }

  /**
   * Shrink one step (normal → small, large → normal)
   */
  shrink(): void {
    switch (this.currentSize) {
      case 'large':
        this.changeSize('normal');
        break;
      case 'normal':
        this.changeSize('small');
        break;
      // Already small - do nothing
    }
  }

  /**
   * Grow one step (small → normal, normal → large)
   */
  grow(): void {
    switch (this.currentSize) {
      case 'small':
        this.changeSize('normal');
        break;
      case 'normal':
        this.changeSize('large');
        break;
      // Already large - do nothing
    }
  }

  /**
   * Reset to normal size
   */
  reset(): void {
    this.changeSize('normal');
  }

  /**
   * Check if player can fit in a space of given height
   */
  canFitHeight(height: number): boolean {
    const config = SIZE_CONFIGS[this.currentSize];
    const playerHeight = config.capsuleHeight * 2 + config.capsuleRadius * 2;
    return playerHeight <= height;
  }

  /**
   * Update the physics collider for new size
   */
  private updateCollider(config: SizeConfig): void {
    // Remove existing colliders
    const numColliders = this.playerBody.numColliders();
    for (let i = numColliders - 1; i >= 0; i--) {
      const collider = this.playerBody.collider(i);
      this.world.removeCollider(collider, false);
    }

    // Create new collider with updated size
    const colliderDesc = RAPIER.ColliderDesc.capsule(
      config.capsuleHeight,
      config.capsuleRadius
    );
    colliderDesc.setFriction(0.5);
    this.world.createCollider(colliderDesc, this.playerBody);
  }

  /**
   * Play visual/audio effect when size changes
   */
  private playTransitionEffect(newSize: SizeState): void {
    // TODO: Add particle effects and sound
    // For now, just log
    const sizeNames = { small: 'TINY', normal: 'NORMAL', large: 'GIANT' };
    console.log(`Alice is now ${sizeNames[newSize]}!`);
  }
}

// Export the config type for use elsewhere
export type { SizeConfig };
export { SIZE_CONFIGS };
