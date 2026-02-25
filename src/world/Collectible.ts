/**
 * Collectible - Manages collectible items in the game
 *
 * Handles keys, stars, and cards with pickup detection,
 * animations, and inventory tracking.
 */

import * as THREE from 'three';
import type { CollectibleObject } from './LevelBuilder';

export interface CollectionState {
  hasKey: boolean;
  stars: number;
  cards: number;
  totalStars: number;
  totalCards: number;
}

export class CollectibleManager {
  private collectibles: CollectibleObject[] = [];
  private state: CollectionState = {
    hasKey: false,
    stars: 0,
    cards: 0,
    totalStars: 0,
    totalCards: 0
  };

  // Hover glow settings
  private glowDistance: number = 4; // Distance at which glow starts
  private pulseTime: number = 0;

  // Cached mesh references for performance (avoid traverse every frame)
  private meshCache: Map<CollectibleObject, THREE.Mesh[]> = new Map();

  // Callback when something is collected
  public onCollect: ((type: string, state: CollectionState, position: THREE.Vector3) => void) | null = null;
  public onKeyCollected: (() => void) | null = null;

  /**
   * Set the collectibles to manage
   */
  setCollectibles(collectibles: CollectibleObject[]): void {
    this.collectibles = collectibles;
    this.meshCache.clear();

    // Cache mesh references for each collectible
    for (const collectible of collectibles) {
      const meshes: THREE.Mesh[] = [];
      collectible.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
        }
      });
      this.meshCache.set(collectible, meshes);
    }

    // Count totals
    this.state.totalStars = collectibles.filter(c => c.type === 'star').length;
    this.state.totalCards = collectibles.filter(c => c.type === 'card').length;
    this.state.hasKey = false;
    this.state.stars = 0;
    this.state.cards = 0;
  }

  /**
   * Update collectible animations and check for pickups
   */
  update(dt: number, playerPosition: THREE.Vector3, playerRadius: number): void {
    // Update pulse time for glow animation
    this.pulseTime += dt * 4;

    for (const collectible of this.collectibles) {
      if (collectible.collected) continue;

      // Bobbing and rotation animation
      collectible.mesh.rotation.y += dt * 2;
      collectible.mesh.position.y = collectible.position.y + Math.sin(Date.now() * 0.003) * 0.1;

      // Check distance to player
      const distance = collectible.mesh.position.distanceTo(playerPosition);
      const pickupRadius = 1.0 + playerRadius;

      // Hover glow effect based on distance
      const cachedMeshes = this.meshCache.get(collectible) || [];

      if (distance < this.glowDistance) {
        // Calculate glow intensity (stronger when closer)
        const proximity = 1 - (distance / this.glowDistance);
        const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime);
        const intensity = proximity * (0.6 + pulse * 0.4);

        // Apply to cached meshes (no traverse needed)
        for (const mesh of cachedMeshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = 0.3 + intensity;
          }
        }

        // Scale up slightly when close
        const scale = 1 + proximity * 0.15;
        collectible.mesh.scale.setScalar(scale);
      } else {
        // Reset to default when far
        for (const mesh of cachedMeshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = 0.3;
          }
        }
        collectible.mesh.scale.setScalar(1);
      }

      if (distance < pickupRadius) {
        this.collect(collectible);
      }
    }
  }

  /**
   * Collect an item
   */
  private collect(collectible: CollectibleObject): void {
    if (collectible.collected) return;

    collectible.collected = true;
    collectible.mesh.visible = false;

    // Update state based on type
    switch (collectible.type) {
      case 'key':
        this.state.hasKey = true;
        console.log('Collected the Golden Key!');
        if (this.onKeyCollected) {
          this.onKeyCollected();
        }
        break;
      case 'star':
        this.state.stars++;
        console.log(`Collected star ${this.state.stars}/${this.state.totalStars}`);
        break;
      case 'card':
        this.state.cards++;
        console.log(`Collected card ${this.state.cards}/${this.state.totalCards}`);
        break;
    }

    // Notify listeners
    if (this.onCollect) {
      this.onCollect(collectible.type, this.state, collectible.position);
    }
  }

  /**
   * Get current collection state
   */
  getState(): CollectionState {
    return { ...this.state };
  }

  /**
   * Check if player has the key
   */
  hasKey(): boolean {
    return this.state.hasKey;
  }

  /**
   * Reset collection state
   */
  reset(): void {
    this.state = {
      hasKey: false,
      stars: 0,
      cards: 0,
      totalStars: 0,
      totalCards: 0
    };

    for (const collectible of this.collectibles) {
      collectible.collected = false;
      collectible.mesh.visible = true;
    }
  }
}
