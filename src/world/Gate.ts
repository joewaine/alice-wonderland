/**
 * Gate - Chapter transition gate
 *
 * Locked until player collects the Golden Key.
 * Walking through unlocked gate triggers chapter transition.
 */

import * as THREE from 'three';
import { audioManager } from '../audio/AudioManager';

export class Gate {
  private gateGroup: THREE.Group | null = null;
  private barrier: THREE.Mesh | null = null;
  private position: THREE.Vector3;
  private isUnlocked: boolean = false;
  private isPlayerInProximity: boolean = false;
  private lastProximityChimeTime: number = 0;
  private static readonly PROXIMITY_RADIUS = 6;
  private static readonly PROXIMITY_CHIME_COOLDOWN = 3000; // ms

  public onEnter: (() => void) | null = null;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
  }

  /**
   * Find and setup the gate in the scene
   */
  setup(scene: THREE.Scene): void {
    scene.traverse((obj) => {
      if (obj.userData.isGate) {
        this.gateGroup = obj as THREE.Group;

        // Find barrier mesh
        obj.traverse((child) => {
          if (child.userData.isGateBarrier && child instanceof THREE.Mesh) {
            this.barrier = child;
          }
        });
      }
    });
  }

  /**
   * Unlock the gate (called when key is collected)
   */
  unlock(): void {
    if (this.isUnlocked) return;

    this.isUnlocked = true;

    if (this.barrier) {
      // Change to soft mint green - inviting and magical
      const material = this.barrier.material as THREE.MeshBasicMaterial;
      material.color.set(0xC4E8D4);  // Soft mint
      material.opacity = 0.4;

      // Add pulsing animation via userData
      this.barrier.userData.pulseTime = 0;
    }

    console.log('Gate unlocked!');
  }

  /**
   * Check if gate is unlocked
   */
  getIsUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * Update gate animations and check for player entry
   */
  update(dt: number, playerPosition: THREE.Vector3): void {
    if (!this.gateGroup) return;

    // Pulse animation when unlocked
    if (this.isUnlocked && this.barrier) {
      this.barrier.userData.pulseTime = (this.barrier.userData.pulseTime || 0) + dt;
      const pulse = 0.3 + Math.sin(this.barrier.userData.pulseTime * 3) * 0.1;
      (this.barrier.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // Check if player is at gate
    const gatePos = this.gateGroup.position;
    const distanceXZ = Math.sqrt(
      Math.pow(playerPosition.x - gatePos.x, 2) +
      Math.pow(playerPosition.z - gatePos.z, 2)
    );

    // Check proximity for chime (larger radius than entry)
    const inProximity = distanceXZ < Gate.PROXIMITY_RADIUS && Math.abs(playerPosition.y - gatePos.y) < 5;

    if (this.isUnlocked && inProximity && !this.isPlayerInProximity) {
      const now = Date.now();
      if (now - this.lastProximityChimeTime > Gate.PROXIMITY_CHIME_COOLDOWN) {
        audioManager.playGateProximity();
        this.lastProximityChimeTime = now;
      }
    }
    this.isPlayerInProximity = inProximity;

    const nearGate = distanceXZ < 2 && Math.abs(playerPosition.y - gatePos.y) < 3;

    if (nearGate && this.isUnlocked && this.onEnter) {
      this.onEnter();
    }
  }

  /**
   * Reset gate state
   */
  reset(): void {
    this.isUnlocked = false;

    if (this.barrier) {
      const material = this.barrier.material as THREE.MeshBasicMaterial;
      material.color.set(0xff0000);
      material.opacity = 0.5;
    }
  }

  /**
   * Get gate position
   */
  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
}
