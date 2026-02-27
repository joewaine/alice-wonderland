/**
 * SizePickup - Potions that change Alice's size
 *
 * Purple potions make Alice shrink.
 * Pink/magenta potions make Alice grow.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createCelShaderMaterial } from '../shaders/CelShaderMaterial';

export type PickupType = 'shrink' | 'grow';

export class SizePickup {
  public mesh: THREE.Group;
  public collider: RAPIER.Collider;
  public type: PickupType;
  public isCollected: boolean = false;

  private bobOffset: number = 0;
  private initialY: number;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    position: THREE.Vector3,
    type: PickupType
  ) {
    this.type = type;
    this.initialY = position.y;

    // Create visual mesh
    this.mesh = this.createMesh(type);
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    // Create sensor collider (doesn't block movement, just detects overlap)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x,
      position.y,
      position.z
    );
    const body = world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.ball(0.5)
      .setSensor(true); // Sensor = triggers events but no collision
    this.collider = world.createCollider(colliderDesc, body);
  }

  /**
   * Create the visual mesh based on pickup type
   */
  private createMesh(type: PickupType): THREE.Group {
    const group = new THREE.Group();

    if (type === 'shrink') {
      // Purple potion bottle for shrinking
      // Bottle body
      const bottleGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 8);
      const bottleMat = createCelShaderMaterial({
        color: 0x9966CC,
        shadowColor: 0x663399,
        highlightColor: 0xCC99FF,
        rimColor: 0xAA77DD,
        transparent: true,
        opacity: 0.85
      });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.y = 0.25;
      bottle.castShadow = true;
      group.add(bottle);

      // Bottle neck
      const neckGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8);
      const neck = new THREE.Mesh(neckGeo, bottleMat);
      neck.position.y = 0.6;
      group.add(neck);

      // Cork
      const corkGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);
      const corkMat = createCelShaderMaterial({
        color: 0x8b4513,
        shadowColor: 0x5c2d0a,
        highlightColor: 0xb5651d,
        rimColor: 0xa0522d
      });
      const cork = new THREE.Mesh(corkGeo, corkMat);
      cork.position.y = 0.75;
      group.add(cork);

      // Liquid glow (inner sphere)
      const glowGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xBB88EE,
        transparent: true,
        opacity: 0.5
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.25;
      group.add(glow);

      // "DRINK ME" label (just a small rectangle)
      const labelGeo = new THREE.PlaneGeometry(0.2, 0.1);
      const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.set(0.21, 0.25, 0);
      label.rotation.y = Math.PI / 2;
      group.add(label);

    } else {
      // Pink/magenta potion bottle for growing
      // Bottle body
      const bottleGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 8);
      const bottleMat = createCelShaderMaterial({
        color: 0xDD66AA,
        shadowColor: 0xAA3377,
        highlightColor: 0xFFAACC,
        rimColor: 0xEE88BB,
        transparent: true,
        opacity: 0.85
      });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.y = 0.25;
      bottle.castShadow = true;
      group.add(bottle);

      // Bottle neck
      const neckGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8);
      const neck = new THREE.Mesh(neckGeo, bottleMat);
      neck.position.y = 0.6;
      group.add(neck);

      // Cork
      const corkGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);
      const corkMat = createCelShaderMaterial({
        color: 0x8b4513,
        shadowColor: 0x5c2d0a,
        highlightColor: 0xb5651d,
        rimColor: 0xa0522d
      });
      const cork = new THREE.Mesh(corkGeo, corkMat);
      cork.position.y = 0.75;
      group.add(cork);

      // Liquid glow (inner sphere)
      const glowGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xFF99BB,
        transparent: true,
        opacity: 0.5
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.25;
      group.add(glow);

      // "DRINK ME" label (just a small rectangle)
      const labelGeo = new THREE.PlaneGeometry(0.2, 0.1);
      const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.set(0.21, 0.25, 0);
      label.rotation.y = Math.PI / 2;
      group.add(label);
    }

    return group;
  }

  /**
   * Update animation (bobbing up and down, rotating)
   */
  update(dt: number): void {
    if (this.isCollected) return;

    // Bobbing
    this.bobOffset += dt * 2;
    this.mesh.position.y = this.initialY + Math.sin(this.bobOffset) * 0.1;

    // Slow rotation
    this.mesh.rotation.y += dt * 0.5;
  }

  /**
   * Collect the pickup (hide it)
   */
  collect(): void {
    if (this.isCollected) return;

    this.isCollected = true;
    this.mesh.visible = false;

    // TODO: Play collection sound and particles
    console.log(`Collected ${this.type} pickup!`);
  }

  /**
   * Check if a position overlaps with this pickup
   */
  checkOverlap(position: THREE.Vector3, radius: number): boolean {
    if (this.isCollected) return false;

    const dist = this.mesh.position.distanceTo(position);
    return dist < (0.5 + radius); // 0.5 is pickup radius
  }

  /**
   * Respawn the pickup (for testing or timed respawns)
   */
  respawn(): void {
    this.isCollected = false;
    this.mesh.visible = true;
  }

  /**
   * Clean up resources
   */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    // Collider cleanup handled by world
  }
}
