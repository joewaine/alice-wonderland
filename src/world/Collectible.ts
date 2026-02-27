/**
 * Collectible - Manages collectible items in the game
 *
 * Handles keys and cards with pickup detection,
 * animations, and inventory tracking.
 */

import * as THREE from 'three';
import type { CollectibleObject } from './LevelBuilder';

export interface CollectionState {
  hasKey: boolean;
  cards: number;
  totalCards: number;
}

export class CollectibleManager {
  private collectibles: CollectibleObject[] = [];
  private state: CollectionState = {
    hasKey: false,
    cards: 0,
    totalCards: 0
  };

  // Hover glow settings
  private glowDistance: number = 4; // Distance at which glow starts
  private pulseTime: number = 0;

  // Pulsing glow settings (constant attention-drawing pulse)
  private pulseFrequency: number = 1.5; // Hz - pulses per second
  private pulseIntensityMin: number = 0.3;
  private pulseIntensityMax: number = 0.8;

  // Magnet attraction settings
  private magnetDistance: number = 3.5; // Distance at which magnet effect starts
  private magnetSpeedMin: number = 2; // Base drift speed
  private magnetSpeedMax: number = 8; // Max drift speed when very close

  // Cached mesh references for performance (avoid traverse every frame)
  private meshCache: Map<CollectibleObject, THREE.Mesh[]> = new Map();

  // Track spawn positions (never changes, used for reset)
  private spawnPositions: Map<CollectibleObject, THREE.Vector3> = new Map();

  // Track current base positions for magnet effect (drifts toward player)
  private currentPositions: Map<CollectibleObject, THREE.Vector3> = new Map();

  // Pre-allocated vector for magnet direction calculation
  private toPlayerCache: THREE.Vector3 = new THREE.Vector3();

  // Callback for magnet trail particles
  public onMagnetDrift: ((position: THREE.Vector3, towardPlayer: THREE.Vector3) => void) | null = null;

  // Callback when something is collected
  public onCollect: ((type: string, state: CollectionState, position: THREE.Vector3) => void) | null = null;
  public onKeyCollected: (() => void) | null = null;

  /**
   * Set the collectibles to manage
   */
  setCollectibles(collectibles: CollectibleObject[]): void {
    this.collectibles = collectibles;
    this.meshCache.clear();
    this.spawnPositions.clear();
    this.currentPositions.clear();

    // Cache mesh references for each collectible
    for (const collectible of collectibles) {
      const meshes: THREE.Mesh[] = [];
      collectible.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
        }
      });
      this.meshCache.set(collectible, meshes);

      // Store spawn position (never changes) and current position (can drift)
      this.spawnPositions.set(collectible, collectible.position.clone());
      this.currentPositions.set(collectible, collectible.position.clone());
    }

    // Count totals
    this.state.totalCards = collectibles.filter(c => c.type === 'card').length;
    this.state.hasKey = false;
    this.state.cards = 0;
  }

  /**
   * Update collectible animations and check for pickups
   */
  update(dt: number, playerPosition: THREE.Vector3, playerRadius: number): void {
    // Update pulse time for glow animation (2 * PI * frequency for proper Hz)
    this.pulseTime += dt * Math.PI * 2 * this.pulseFrequency;

    for (const collectible of this.collectibles) {
      if (collectible.collected) continue;

      // Get the current base position (can drift toward player)
      const currentPos = this.currentPositions.get(collectible);
      if (!currentPos) continue;

      // Check distance to player from current base position
      const distance = currentPos.distanceTo(playerPosition);
      const pickupRadius = 1.5 + playerRadius;

      // Magnet attraction effect - only for cards, not key
      if (collectible.type !== 'key' && distance < this.magnetDistance && distance > pickupRadius) {
        // Calculate drift speed - faster as player gets closer
        const proximity = 1 - (distance / this.magnetDistance);
        const driftSpeed = this.magnetSpeedMin + (this.magnetSpeedMax - this.magnetSpeedMin) * proximity * proximity;

        // Direction toward player
        this.toPlayerCache.subVectors(playerPosition, currentPos).normalize();

        // Move the current position toward player (this is the "drifting" base position)
        currentPos.addScaledVector(this.toPlayerCache, driftSpeed * dt);

        // Emit magnet trail particles occasionally
        if (this.onMagnetDrift && Math.random() < 0.3) {
          this.onMagnetDrift(currentPos.clone(), this.toPlayerCache);
        }
      }

      // Bobbing and rotation animation (relative to current base position)
      collectible.mesh.rotation.y += dt * 2;
      collectible.mesh.position.x = currentPos.x;
      collectible.mesh.position.y = currentPos.y + Math.sin(Date.now() * 0.00628) * 0.18;
      collectible.mesh.position.z = currentPos.z;

      // Update collectible.position to match drifted position for collection detection
      collectible.position.copy(currentPos);

      // Re-check distance after potential drift for glow and collection
      const currentDistance = collectible.mesh.position.distanceTo(playerPosition);

      // Pulsing glow effect - always active to draw attention
      const cachedMeshes = this.meshCache.get(collectible) || [];

      // Base pulsing intensity (sine wave between min and max)
      const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime);
      const baseIntensity = this.pulseIntensityMin + pulse * (this.pulseIntensityMax - this.pulseIntensityMin);

      // Enhance glow when player is close
      let finalIntensity = baseIntensity;
      let scale = 1;

      if (currentDistance < this.glowDistance) {
        // Calculate proximity boost (stronger when closer)
        const proximity = 1 - (currentDistance / this.glowDistance);
        // Add up to 0.4 extra intensity when very close
        finalIntensity = baseIntensity + proximity * 0.4;
        // Scale up slightly when close
        scale = 1 + proximity * 0.15;
      }

      // Apply glow to cached meshes
      for (const mesh of cachedMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity !== undefined) {
          // Set emissive color based on collectible type if not already set
          if (mat.emissive && mat.emissive.getHex() === 0x000000) {
            // Cards default to red emissive
            if (collectible.type === 'card') {
              mat.emissive.setHex(0xff4444);
            } else {
              // Keys get gold emissive
              mat.emissive.setHex(0xffd700);
            }
          }
          mat.emissiveIntensity = finalIntensity;
        }
      }

      collectible.mesh.scale.setScalar(scale);

      if (currentDistance < pickupRadius) {
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
      cards: 0,
      totalCards: 0
    };

    for (const collectible of this.collectibles) {
      collectible.collected = false;
      collectible.mesh.visible = true;

      // Reset position to original spawn point (undo magnet drift)
      const spawnPos = this.spawnPositions.get(collectible);
      const currentPos = this.currentPositions.get(collectible);
      if (spawnPos && currentPos) {
        // Restore current position to spawn position
        currentPos.copy(spawnPos);
        collectible.position.copy(spawnPos);
        collectible.mesh.position.copy(spawnPos);
      }
    }
  }
}
