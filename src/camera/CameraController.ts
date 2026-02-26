/**
 * CameraController - N64-style third-person camera
 *
 * Features:
 * - Manual orbit rotation (arrow keys and right-click drag)
 * - Wall collision avoidance (camera pushes closer when blocked)
 * - Contextual zoom (adjusts based on environment)
 * - Smooth transitions between positions
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { InputManager } from '../engine/InputManager';

interface CameraConfig {
  // Target distance from player
  targetDistance: number;
  // Height offset above player
  heightOffset: number;
  // Rotation sensitivity
  rotationSpeed: number;
  // Mouse sensitivity (for right-click drag)
  mouseSensitivity: number;
  // Pitch limits (radians)
  minPitch: number;
  maxPitch: number;
  // Smooth follow speed
  followLerp: number;
  // Distance lerp when adjusting for walls
  distanceLerp: number;
}

interface CameraZone {
  bounds: THREE.Box3;
  targetDistance: number;
  heightOffset: number;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private world: RAPIER.World;

  // Current rotation state
  private yaw: number = 0;
  private pitch: number = 0.3;

  // Current vs target distance (for smooth wall avoidance)
  private currentDistance: number = 8;
  private targetDistance: number = 8;

  // Height offset
  private heightOffset: number = 2;
  private targetHeightOffset: number = 2;

  // Configuration
  private config: CameraConfig = {
    targetDistance: 8,
    heightOffset: 2,
    rotationSpeed: 2.5,
    mouseSensitivity: 0.003,
    minPitch: 0.1,
    maxPitch: 1.2,
    followLerp: 8,
    distanceLerp: 5,
  };

  // Camera zones for contextual zoom
  private zones: CameraZone[] = [];

  // Right-click drag state
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Raycast state for collision avoidance
  private ray: RAPIER.Ray;
  private rayDirection: THREE.Vector3 = new THREE.Vector3();

  // Collision group filter (ignore player collider)
  private collisionGroups: number;

  // Canvas reference for event listener cleanup
  private canvas: HTMLElement;

  // Pre-allocated vectors to avoid per-frame allocations
  private idealPosCache: THREE.Vector3 = new THREE.Vector3();
  private lookAtCache: THREE.Vector3 = new THREE.Vector3();

  // Screen shake state
  private shakeIntensity: number = 0;
  private shakeOffset: THREE.Vector3 = new THREE.Vector3();
  private readonly SHAKE_DECAY = 0.88;  // How quickly shake fades

  // Bound event handlers (stored for removal in dispose)
  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) {
      // Right click
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      e.preventDefault();
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 2) {
      this.isDragging = false;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.rotate(-deltaX, deltaY);

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private handleMouseLeave = (): void => {
    this.isDragging = false;
  };

  private handleContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  constructor(
    camera: THREE.PerspectiveCamera,
    world: RAPIER.World,
    renderer: THREE.WebGLRenderer
  ) {
    this.camera = camera;
    this.world = world;
    this.canvas = renderer.domElement;

    // Initialize ray for collision detection
    this.ray = new RAPIER.Ray(
      new RAPIER.Vector3(0, 0, 0),
      new RAPIER.Vector3(0, 0, 1)
    );

    // Default collision groups - interact with everything
    this.collisionGroups = 0xffffffff;

    // Setup mouse events for right-click drag
    this.setupMouseEvents();
  }

  /**
   * Setup mouse event listeners for right-click drag rotation
   */
  private setupMouseEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  /**
   * Rotate camera by delta amounts
   */
  rotate(deltaX: number, deltaY: number): void {
    this.yaw += deltaX * this.config.mouseSensitivity;
    this.pitch += deltaY * this.config.mouseSensitivity;

    // Clamp pitch
    this.pitch = Math.max(this.config.minPitch, Math.min(this.config.maxPitch, this.pitch));
  }

  /**
   * Update camera from keyboard input
   */
  private updateFromInput(dt: number, input: InputManager): void {
    const rotSpeed = this.config.rotationSpeed * dt;

    if (input.lookLeft) this.yaw += rotSpeed;
    if (input.lookRight) this.yaw -= rotSpeed;
    if (input.lookUp) this.pitch -= rotSpeed * 0.5;
    if (input.lookDown) this.pitch += rotSpeed * 0.5;

    // Clamp pitch
    this.pitch = Math.max(this.config.minPitch, Math.min(this.config.maxPitch, this.pitch));
  }

  /**
   * Check for camera zones at player position
   */
  private updateZone(playerPos: THREE.Vector3): void {
    let foundZone: CameraZone | null = null;

    for (const zone of this.zones) {
      if (zone.bounds.containsPoint(playerPos)) {
        foundZone = zone;
        break;
      }
    }

    if (foundZone) {
      this.targetDistance = foundZone.targetDistance;
      this.targetHeightOffset = foundZone.heightOffset;
    } else {
      // Default outdoor values
      this.targetDistance = this.config.targetDistance;
      this.targetHeightOffset = this.config.heightOffset;
    }
  }

  /**
   * Calculate ideal camera position based on yaw/pitch
   * Uses pre-allocated vector to avoid per-frame allocations
   */
  private getIdealPosition(playerPos: THREE.Vector3, distance: number): THREE.Vector3 {
    const x = playerPos.x + Math.sin(this.yaw) * Math.cos(this.pitch) * distance;
    const y = playerPos.y + Math.sin(this.pitch) * distance + this.heightOffset;
    const z = playerPos.z + Math.cos(this.yaw) * Math.cos(this.pitch) * distance;

    return this.idealPosCache.set(x, y, z);
  }

  /**
   * Check for walls between camera and player using raycast
   */
  private checkWallCollision(playerPos: THREE.Vector3): number {
    // Start ray from player, pointing toward ideal camera position
    const idealPos = this.getIdealPosition(playerPos, this.targetDistance);

    // Direction from player to ideal camera position
    this.rayDirection.subVectors(idealPos, playerPos).normalize();

    // Setup ray
    this.ray.origin.x = playerPos.x;
    this.ray.origin.y = playerPos.y + this.heightOffset * 0.5;
    this.ray.origin.z = playerPos.z;

    this.ray.dir.x = this.rayDirection.x;
    this.ray.dir.y = this.rayDirection.y;
    this.ray.dir.z = this.rayDirection.z;

    // Cast ray
    const hit = this.world.castRay(
      this.ray,
      this.targetDistance,
      false, // Don't include sensors
      this.collisionGroups
    );

    if (hit) {
      // Wall hit - camera should be closer
      const hitDistance = hit.timeOfImpact;
      // Pull camera in front of the wall with a small buffer
      return Math.max(1.5, hitDistance * 0.85);
    }

    // No obstruction - use target distance
    return this.targetDistance;
  }

  /**
   * Main update - call each frame
   */
  update(dt: number, playerPos: THREE.Vector3, input: InputManager): void {
    // Update from keyboard input
    this.updateFromInput(dt, input);

    // Check for camera zones
    this.updateZone(playerPos);

    // Check wall collision and adjust distance
    const desiredDistance = this.checkWallCollision(playerPos);

    // Smoothly interpolate current distance
    // Quick pull-in when hitting walls, slower pull-out when clear
    const lerpSpeed = desiredDistance < this.currentDistance
      ? this.config.distanceLerp * 3  // Fast pull-in
      : this.config.distanceLerp;      // Normal pull-out

    this.currentDistance = THREE.MathUtils.lerp(
      this.currentDistance,
      desiredDistance,
      Math.min(1, lerpSpeed * dt)
    );

    // Smoothly interpolate height offset
    this.heightOffset = THREE.MathUtils.lerp(
      this.heightOffset,
      this.targetHeightOffset,
      Math.min(1, this.config.followLerp * dt)
    );

    // Calculate final camera position (uses pre-allocated vector)
    const camPos = this.getIdealPosition(playerPos, this.currentDistance);

    // Apply position with smoothing
    this.camera.position.lerp(camPos, Math.min(1, this.config.followLerp * dt));

    // Apply screen shake if active
    if (this.shakeIntensity > 0.001) {
      // Random offset based on intensity
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity * 0.8,
        (Math.random() - 0.5) * this.shakeIntensity * 0.5,
        (Math.random() - 0.5) * this.shakeIntensity * 0.8
      );
      this.camera.position.add(this.shakeOffset);

      // Decay shake intensity
      this.shakeIntensity *= this.SHAKE_DECAY;
    }

    // Look at player (slightly above center) - uses pre-allocated vector
    this.lookAtCache.set(
      playerPos.x,
      playerPos.y + this.heightOffset * 0.5,
      playerPos.z
    );
    this.camera.lookAt(this.lookAtCache);
  }

  /**
   * Get current yaw for player controller (movement relative to camera)
   */
  getYaw(): number {
    return this.yaw;
  }

  /**
   * Reset camera rotation
   */
  reset(): void {
    this.yaw = 0;
    this.pitch = 0.3;
    this.currentDistance = this.config.targetDistance;
  }

  /**
   * Set target distance (called when player size changes)
   */
  setTargetDistance(distance: number): void {
    this.config.targetDistance = distance;
  }

  /**
   * Set height offset (called when player size changes)
   */
  setHeightOffset(offset: number): void {
    this.config.heightOffset = offset;
  }

  /**
   * Add a camera zone for contextual adjustments
   */
  addZone(zone: CameraZone): void {
    this.zones.push(zone);
  }

  /**
   * Clear all camera zones (call on level change)
   */
  clearZones(): void {
    this.zones = [];
  }

  /**
   * Set zones from level data
   */
  setZones(zones: CameraZone[]): void {
    this.zones = zones;
  }

  /**
   * Trigger screen shake effect
   * @param intensity - Shake strength (0.1 = subtle, 0.5 = strong, 1.0 = intense)
   */
  shake(intensity: number): void {
    // Add to existing shake if already shaking, capped at max
    this.shakeIntensity = Math.min(1.0, this.shakeIntensity + intensity);
  }

  /**
   * Dispose of the camera controller and remove event listeners
   * Call this when destroying the controller to prevent memory leaks
   */
  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }
}
