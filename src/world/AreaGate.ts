/**
 * AreaGate - Blocking barrier that unlocks when a quest is completed
 *
 * Creates a physics collider (and optional visual mesh) that blocks
 * player passage until the associated quest is completed.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createCelShaderMaterial } from '../shaders/CelShaderMaterial';
import { addOutlinesToObject } from '../shaders/OutlineEffect';

export interface AreaGateConfig {
  position: THREE.Vector3;
  size: THREE.Vector3;
  areaId: string;
  visible?: boolean;           // Whether to show a visual mesh (default: true)
  color?: number;              // Visual color (default: hedge green)
  unlockDuration?: number;     // Animation duration in ms (default: 1000)
}

export class AreaGate {
  private mesh: THREE.Mesh | null = null;
  private body: RAPIER.RigidBody | null = null;
  private collider: RAPIER.Collider | null = null;
  private world: RAPIER.World;
  private scene: THREE.Scene;
  private areaId: string;
  private unlocked: boolean = false;
  private unlockDuration: number;

  // Animation state
  private isAnimating: boolean = false;
  private animationProgress: number = 0;
  private originalPosition: THREE.Vector3;
  private originalScale: THREE.Vector3;

  // Callbacks
  public onUnlocked: ((areaId: string) => void) | null = null;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    config: AreaGateConfig
  ) {
    this.world = world;
    this.scene = scene;
    this.areaId = config.areaId;
    this.unlockDuration = config.unlockDuration ?? 1000;
    this.originalPosition = config.position.clone();
    this.originalScale = new THREE.Vector3(1, 1, 1);

    this.createGate(config);
  }

  /**
   * Create the gate visual and physics
   */
  private createGate(config: AreaGateConfig): void {
    const { position, size, visible = true, color = 0x2D5A27 } = config;

    // Create visual mesh if visible
    if (visible) {
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

      // Use cel-shader material (hedge green by default)
      const material = createCelShaderMaterial({
        color: new THREE.Color(color),
        shadowColor: 0x1A3518,     // Dark green shadow
        highlightColor: 0xfff8e7,  // Warm highlight
        rimColor: 0x88CC88,        // Light green rim
        rimPower: 3.0,
        steps: 3,
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.copy(position);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;

      // Add outline
      addOutlinesToObject(this.mesh, {
        color: 0x2d3748,
        thickness: 0.02,
      });

      this.mesh.userData.areaGate = true;
      this.mesh.userData.areaId = this.areaId;

      this.scene.add(this.mesh);
    }

    // Create physics body and collider
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);
    this.body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      size.x / 2,
      size.y / 2,
      size.z / 2
    );
    this.collider = this.world.createCollider(colliderDesc, this.body);
  }

  /**
   * Unlock the gate (remove barrier, play animation)
   */
  unlock(): void {
    if (this.unlocked) return;

    this.unlocked = true;
    this.isAnimating = true;
    this.animationProgress = 0;

    // Remove physics collider immediately (player can pass through)
    if (this.collider && this.body) {
      this.world.removeCollider(this.collider, true);
      this.collider = null;
    }

    console.log(`AreaGate: Unlocked gate for area "${this.areaId}"`);
    this.onUnlocked?.(this.areaId);
  }

  /**
   * Update animation (call each frame)
   */
  update(dt: number): void {
    if (!this.isAnimating || !this.mesh) return;

    // Animate the mesh (sink into ground + fade out)
    this.animationProgress += (dt * 1000) / this.unlockDuration;

    if (this.animationProgress >= 1) {
      this.animationProgress = 1;
      this.isAnimating = false;

      // Remove mesh from scene
      this.scene.remove(this.mesh);
      this.disposeMesh();
      return;
    }

    // Ease out cubic
    const t = 1 - Math.pow(1 - this.animationProgress, 3);

    // Sink into ground
    this.mesh.position.y = this.originalPosition.y - (t * 3);

    // Scale down horizontally
    this.mesh.scale.x = this.originalScale.x * (1 - t * 0.5);
    this.mesh.scale.z = this.originalScale.z * (1 - t * 0.5);

    // Fade out material
    const material = this.mesh.material as THREE.ShaderMaterial;
    if (material.uniforms?.opacity !== undefined) {
      material.uniforms.opacity.value = 1 - t;
    }
  }

  /**
   * Check if the gate is unlocked
   */
  isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Get the area ID this gate controls
   */
  getAreaId(): string {
    return this.areaId;
  }

  /**
   * Get the gate's position
   */
  getPosition(): THREE.Vector3 {
    return this.originalPosition.clone();
  }

  /**
   * Dispose of mesh resources
   */
  private disposeMesh(): void {
    if (!this.mesh) return;

    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(m => m.dispose());
    } else {
      this.mesh.material.dispose();
    }

    // Dispose outline meshes
    this.mesh.traverse(child => {
      if (child !== this.mesh && child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this.mesh = null;
  }

  /**
   * Full cleanup
   */
  cleanup(): void {
    // Remove collider if not already removed
    if (this.collider) {
      this.world.removeCollider(this.collider, true);
      this.collider = null;
    }

    // Remove body
    if (this.body) {
      this.world.removeRigidBody(this.body);
      this.body = null;
    }

    // Remove and dispose mesh
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.disposeMesh();
    }

    this.onUnlocked = null;
  }
}
