/**
 * SizePickup - Mushrooms and potions that change Alice's size
 *
 * Red mushrooms make Alice shrink.
 * Blue potions make Alice grow.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

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
      // Red mushroom for shrinking
      // Stem
      const stemGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0xf5e6d3 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.2;
      stem.castShadow = true;
      group.add(stem);

      // Cap
      const capGeo = new THREE.SphereGeometry(0.35, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.4;
      cap.castShadow = true;
      group.add(cap);

      // White spots on cap
      const spotGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const spotMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const spotPositions = [
        { x: 0.15, y: 0.55, z: 0.15 },
        { x: -0.2, y: 0.5, z: 0.1 },
        { x: 0, y: 0.6, z: -0.2 },
        { x: 0.1, y: 0.45, z: -0.15 }
      ];
      spotPositions.forEach(pos => {
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.set(pos.x, pos.y, pos.z);
        group.add(spot);
      });

    } else {
      // Blue potion bottle for growing
      // Bottle body
      const bottleGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 8);
      const bottleMat = new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.7
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
      const corkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const cork = new THREE.Mesh(corkGeo, corkMat);
      cork.position.y = 0.75;
      group.add(cork);

      // Liquid glow (inner sphere)
      const glowGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
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
