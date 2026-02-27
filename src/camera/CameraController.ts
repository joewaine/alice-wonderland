/**
 * CameraController - Modern third-person follow camera
 *
 * Features:
 * - Automatic follow behind player's movement direction
 * - Optional manual look-around (right-click drag), returns to follow
 * - Soft wall fade-through (transparent walls instead of camera pull-in)
 * - Contextual zoom (adjusts based on environment)
 * - Smooth damped transitions
 */

import * as THREE from 'three';

interface CameraConfig {
  // Target distance from player
  targetDistance: number;
  // Height offset above player
  heightOffset: number;
  // Mouse sensitivity (for right-click drag)
  mouseSensitivity: number;
  // Pitch limits (radians)
  minPitch: number;
  maxPitch: number;
  // Smooth follow speed
  followLerp: number;
  // Distance lerp for smooth transitions
  distanceLerp: number;
}

interface CameraZone {
  bounds: THREE.Box3;
  targetDistance: number;
  heightOffset: number;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;

  // Current rotation state
  private yaw: number = 0;
  private pitch: number = 0.35;

  // Auto-follow: camera orbits to stay behind player's facing direction
  private playerFacingYaw: number | null = null;
  private readonly AUTO_FOLLOW_SPEED = 5;

  // Manual look state (right-click drag overrides auto-follow)
  private manualLookActive: boolean = false;
  private manualLookTimer: number = 0;
  private readonly RETURN_TO_FOLLOW_DELAY = 0.3;
  private readonly RETURN_TO_FOLLOW_SPEED = 2.0;

  // Current vs target distance
  private currentDistance: number = 7;
  private targetDistance: number = 7;

  // Height offset
  private heightOffset: number = 2.0;
  private targetHeightOffset: number = 2.0;

  // Configuration
  private config: CameraConfig = {
    targetDistance: 7,
    heightOffset: 2.0,
    mouseSensitivity: 0.003,
    minPitch: 0.1,
    maxPitch: 1.2,
    followLerp: 5,
    distanceLerp: 5,
  };

  // Camera zones for contextual zoom
  private zones: CameraZone[] = [];

  // Right-click drag state
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Wall fade-through state
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private playerMesh: THREE.Object3D | null = null;
  private fadedMeshes: Map<THREE.Mesh, { opacity: number; transparent: boolean; isShader: boolean }> = new Map();
  private readonly WALL_FADE_ALPHA = 0.15;

  // Canvas reference for event listener cleanup
  private canvas: HTMLElement;

  // Pre-allocated vectors to avoid per-frame allocations
  private idealPosCache: THREE.Vector3 = new THREE.Vector3();
  private lookAtCache: THREE.Vector3 = new THREE.Vector3();
  private rayDirCache: THREE.Vector3 = new THREE.Vector3();

  // Speed-based look-ahead state
  private lookAheadOffset: THREE.Vector3 = new THREE.Vector3();
  private readonly LOOK_AHEAD_MAX_DISTANCE = 2.5;
  private readonly LOOK_AHEAD_SPEED_THRESHOLD = 0.8;
  private readonly LOOK_AHEAD_LERP_SPEED = 4;
  private readonly MAX_PLAYER_SPEED = 13;

  // Screen shake state
  private shakeIntensity: number = 0;
  private shakeOffset: THREE.Vector3 = new THREE.Vector3();
  private readonly SHAKE_DECAY = 0.88;

  // FOV kick state
  private baseFOV: number = 60;
  private currentFOV: number = 60;
  private targetFOV: number = 60;
  private fovKickDuration: number = 0;
  private fovKickTimer: number = 0;

  // Underwater wobble state
  private underwaterWobbleEnabled: boolean = false;
  private wobbleTime: number = 0;
  private readonly WOBBLE_ROLL_FREQUENCY: number = 0.7;
  private readonly WOBBLE_SWAY_FREQUENCY: number = 0.5;
  private readonly WOBBLE_ROLL_AMPLITUDE: number = 0.04;
  private readonly WOBBLE_SWAY_AMPLITUDE: number = 0.1;

  // Dialogue focus state
  private dialogueFocusEnabled: boolean = false;
  private dialogueFocusLerp: number = 0;
  private readonly DIALOGUE_DISTANCE_MULT = 0.85;
  private readonly DIALOGUE_PITCH_REDUCTION = 0.06;
  private readonly DIALOGUE_FOCUS_SPEED = 3;

  // Size-based distance adjustment
  private sizeDistanceMultiplier: number = 1.0;
  private targetSizeDistanceMultiplier: number = 1.0;
  private readonly SIZE_DISTANCE_LERP_SPEED = 4;

  // Landing dip state
  private dipOffset: number = 0;
  private dipVelocity: number = 0;
  private readonly DIP_RECOVERY_SPEED = 40;

  // Bound event handlers (stored for removal in dispose)
  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) {
      this.isDragging = true;
      this.manualLookActive = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      e.preventDefault();
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 2) {
      this.isDragging = false;
      this.manualLookTimer = this.RETURN_TO_FOLLOW_DELAY;
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
    if (this.isDragging) {
      this.isDragging = false;
      this.manualLookTimer = this.RETURN_TO_FOLLOW_DELAY;
    }
  };

  private handleContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer
  ) {
    this.camera = camera;
    this.scene = scene;
    this.canvas = renderer.domElement;

    // Store the camera's initial FOV as base
    this.baseFOV = camera.fov;
    this.currentFOV = camera.fov;
    this.targetFOV = camera.fov;

    // Setup mouse events for right-click drag
    this.setupMouseEvents();
  }

  private setupMouseEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  private readonly MOUSE_DEAD_ZONE = 0.5;

  /**
   * Rotate camera by delta amounts
   */
  rotate(deltaX: number, deltaY: number): void {
    if (Math.abs(deltaX) < this.MOUSE_DEAD_ZONE) deltaX = 0;
    if (Math.abs(deltaY) < this.MOUSE_DEAD_ZONE) deltaY = 0;
    if (deltaX === 0 && deltaY === 0) return;

    this.yaw += deltaX * this.config.mouseSensitivity;
    this.pitch += deltaY * this.config.mouseSensitivity;
    this.pitch = Math.max(this.config.minPitch, Math.min(this.config.maxPitch, this.pitch));
  }

  /**
   * Set the player mesh (excluded from wall fade raycasts)
   */
  setPlayerMesh(mesh: THREE.Object3D): void {
    this.playerMesh = mesh;
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
      this.targetDistance = this.config.targetDistance;
      this.targetHeightOffset = this.config.heightOffset;
    }
  }

  /**
   * Calculate ideal camera position based on yaw/pitch
   */
  private getIdealPosition(playerPos: THREE.Vector3, distance: number, pitchOverride?: number): THREE.Vector3 {
    const pitch = pitchOverride ?? this.pitch;
    const x = playerPos.x + Math.sin(this.yaw) * Math.cos(pitch) * distance;
    const y = playerPos.y + Math.sin(pitch) * distance + this.heightOffset;
    const z = playerPos.z + Math.cos(this.yaw) * Math.cos(pitch) * distance;

    return this.idealPosCache.set(x, y, z);
  }

  /**
   * Fade meshes between camera and player to transparent.
   * Restores meshes that are no longer occluding.
   */
  private updateWallFade(playerPos: THREE.Vector3): void {
    this.rayDirCache.subVectors(this.camera.position, playerPos).normalize();
    const distance = this.camera.position.distanceTo(playerPos);

    this.raycaster.set(playerPos, this.rayDirCache);
    this.raycaster.near = 0.5;
    this.raycaster.far = distance - 0.5;

    const intersections = this.raycaster.intersectObjects(this.scene.children, true);

    const shouldFade = new Set<THREE.Mesh>();

    for (const intersection of intersections) {
      const obj = intersection.object;
      if (!(obj instanceof THREE.Mesh)) continue;

      // Skip player mesh and its children
      if (this.playerMesh && (obj === this.playerMesh || this.isChildOf(obj, this.playerMesh))) continue;

      // Skip small objects (collectibles, particles)
      if (obj.geometry.boundingSphere) {
        if (obj.geometry.boundingSphere.radius < 0.3) continue;
      }

      shouldFade.add(obj);

      if (!this.fadedMeshes.has(obj)) {
        const mat = obj.material;
        if (Array.isArray(mat)) continue; // Skip multi-material meshes

        if (mat instanceof THREE.ShaderMaterial && mat.uniforms.uOpacity) {
          this.fadedMeshes.set(obj, {
            opacity: mat.uniforms.uOpacity.value,
            transparent: mat.transparent,
            isShader: true,
          });
          mat.transparent = true;
          mat.uniforms.uOpacity.value = this.WALL_FADE_ALPHA;
        } else if ('opacity' in mat) {
          this.fadedMeshes.set(obj, {
            opacity: (mat as THREE.MeshStandardMaterial).opacity,
            transparent: mat.transparent,
            isShader: false,
          });
          mat.transparent = true;
          (mat as THREE.MeshStandardMaterial).opacity = this.WALL_FADE_ALPHA;
        }
      }
    }

    // Restore meshes no longer between camera and player
    for (const [mesh, original] of this.fadedMeshes) {
      if (!shouldFade.has(mesh)) {
        const mat = mesh.material;
        if (!Array.isArray(mat)) {
          if (original.isShader && mat instanceof THREE.ShaderMaterial && mat.uniforms.uOpacity) {
            mat.uniforms.uOpacity.value = original.opacity;
            mat.transparent = original.transparent;
          } else if (!original.isShader && 'opacity' in mat) {
            (mat as THREE.MeshStandardMaterial).opacity = original.opacity;
            mat.transparent = original.transparent;
          }
        }
        this.fadedMeshes.delete(mesh);
      }
    }
  }

  /**
   * Check if obj is a descendant of parent
   */
  private isChildOf(obj: THREE.Object3D, parent: THREE.Object3D): boolean {
    let current = obj.parent;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * Restore all faded meshes to original opacity
   */
  private restoreAllFadedMeshes(): void {
    for (const [mesh, original] of this.fadedMeshes) {
      const mat = mesh.material;
      if (Array.isArray(mat)) continue;
      if (original.isShader && mat instanceof THREE.ShaderMaterial && mat.uniforms.uOpacity) {
        mat.uniforms.uOpacity.value = original.opacity;
        mat.transparent = original.transparent;
      } else if (!original.isShader && 'opacity' in mat) {
        (mat as THREE.MeshStandardMaterial).opacity = original.opacity;
        mat.transparent = original.transparent;
      }
    }
    this.fadedMeshes.clear();
  }

  /**
   * Main update - call each frame
   */
  update(dt: number, playerPos: THREE.Vector3, playerVelocity?: THREE.Vector3): void {
    // Handle manual look return timer
    if (this.manualLookTimer > 0) {
      this.manualLookTimer -= dt;
      if (this.manualLookTimer <= 0) {
        this.manualLookActive = false;
      }
    }

    // Auto-orbit to stay behind player when moving (disabled during right-click drag)
    if (this.playerFacingYaw !== null && !this.isDragging) {
      const behindYaw = this.playerFacingYaw - Math.PI;
      let diff = behindYaw - this.yaw;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;

      // Use gentler speed when returning from manual look
      const speed = this.manualLookActive
        ? this.RETURN_TO_FOLLOW_SPEED
        : this.AUTO_FOLLOW_SPEED;
      this.yaw += diff * Math.min(1, speed * dt);
    }

    // Check for camera zones
    this.updateZone(playerPos);

    // Update dialogue focus lerp
    const targetFocusLerp = this.dialogueFocusEnabled ? 1 : 0;
    this.dialogueFocusLerp = THREE.MathUtils.lerp(
      this.dialogueFocusLerp,
      targetFocusLerp,
      Math.min(1, this.DIALOGUE_FOCUS_SPEED * dt)
    );

    // Smoothly interpolate size-based distance multiplier
    this.sizeDistanceMultiplier = THREE.MathUtils.lerp(
      this.sizeDistanceMultiplier,
      this.targetSizeDistanceMultiplier,
      Math.min(1, this.SIZE_DISTANCE_LERP_SPEED * dt)
    );

    // Calculate desired distance (no wall pull-in — walls fade instead)
    let desiredDistance = this.targetDistance * this.sizeDistanceMultiplier;

    // Apply dialogue focus distance reduction
    if (this.dialogueFocusLerp > 0.001) {
      const focusMult = THREE.MathUtils.lerp(1, this.DIALOGUE_DISTANCE_MULT, this.dialogueFocusLerp);
      desiredDistance *= focusMult;
    }

    // Smooth distance interpolation
    this.currentDistance = THREE.MathUtils.lerp(
      this.currentDistance,
      desiredDistance,
      Math.min(1, this.config.distanceLerp * dt)
    );

    // Smoothly interpolate height offset
    this.heightOffset = THREE.MathUtils.lerp(
      this.heightOffset,
      this.targetHeightOffset,
      Math.min(1, this.config.followLerp * dt)
    );

    // Calculate speed-based look-ahead offset
    if (playerVelocity) {
      const horizontalSpeed = Math.sqrt(playerVelocity.x ** 2 + playerVelocity.z ** 2);
      const speedRatio = horizontalSpeed / this.MAX_PLAYER_SPEED;

      if (speedRatio > this.LOOK_AHEAD_SPEED_THRESHOLD) {
        const lookAheadStrength = (speedRatio - this.LOOK_AHEAD_SPEED_THRESHOLD)
          / (1 - this.LOOK_AHEAD_SPEED_THRESHOLD);
        const lookAheadDist = lookAheadStrength * this.LOOK_AHEAD_MAX_DISTANCE;

        const targetX = (playerVelocity.x / horizontalSpeed) * lookAheadDist;
        const targetZ = (playerVelocity.z / horizontalSpeed) * lookAheadDist;

        this.lookAheadOffset.x = THREE.MathUtils.lerp(
          this.lookAheadOffset.x, targetX, Math.min(1, this.LOOK_AHEAD_LERP_SPEED * dt)
        );
        this.lookAheadOffset.z = THREE.MathUtils.lerp(
          this.lookAheadOffset.z, targetZ, Math.min(1, this.LOOK_AHEAD_LERP_SPEED * dt)
        );
      } else {
        this.lookAheadOffset.x = THREE.MathUtils.lerp(
          this.lookAheadOffset.x, 0, Math.min(1, this.LOOK_AHEAD_LERP_SPEED * dt)
        );
        this.lookAheadOffset.z = THREE.MathUtils.lerp(
          this.lookAheadOffset.z, 0, Math.min(1, this.LOOK_AHEAD_LERP_SPEED * dt)
        );
      }
    }

    // Dialogue-adjusted pitch
    const dialoguePitch = this.dialogueFocusLerp > 0.001
      ? this.pitch - (this.DIALOGUE_PITCH_REDUCTION * this.dialogueFocusLerp)
      : undefined;

    // Calculate final camera position
    const camPos = this.getIdealPosition(playerPos, this.currentDistance, dialoguePitch);

    // Apply position with smoothing
    this.camera.position.lerp(camPos, Math.min(1, this.config.followLerp * dt));

    // Apply landing dip offset
    if (Math.abs(this.dipOffset) > 0.001 || Math.abs(this.dipVelocity) > 0.001) {
      this.dipVelocity += this.DIP_RECOVERY_SPEED * dt;
      this.dipOffset += this.dipVelocity * dt;

      if (this.dipOffset > 0) {
        this.dipOffset = 0;
        this.dipVelocity = 0;
      }

      this.camera.position.y += this.dipOffset;
    }

    // Apply screen shake if active
    if (this.shakeIntensity > 0.001) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity * 0.8,
        (Math.random() - 0.5) * this.shakeIntensity * 0.5,
        (Math.random() - 0.5) * this.shakeIntensity * 0.8
      );
      this.camera.position.add(this.shakeOffset);
      this.shakeIntensity *= this.SHAKE_DECAY;
    }

    // Update FOV kick effect
    if (this.currentFOV !== this.baseFOV || this.targetFOV !== this.baseFOV) {
      if (Math.abs(this.currentFOV - this.targetFOV) > 0.1) {
        this.currentFOV = THREE.MathUtils.lerp(this.currentFOV, this.targetFOV, 0.3);
      } else {
        this.currentFOV = this.targetFOV;
      }

      this.fovKickTimer += dt;
      if (this.fovKickTimer >= this.fovKickDuration * 0.3) {
        this.targetFOV = this.baseFOV;
      }

      if (Math.abs(this.camera.fov - this.currentFOV) > 0.01) {
        this.camera.fov = this.currentFOV;
        this.camera.updateProjectionMatrix();
      }
    }

    // Look at player with look-ahead offset
    this.lookAtCache.set(
      playerPos.x + this.lookAheadOffset.x,
      playerPos.y + this.heightOffset * 0.5,
      playerPos.z + this.lookAheadOffset.z
    );
    this.camera.lookAt(this.lookAtCache);

    // Apply underwater wobble effect after lookAt
    if (this.underwaterWobbleEnabled) {
      this.wobbleTime += dt;

      const rollAngle = Math.sin(this.wobbleTime * Math.PI * 2 * this.WOBBLE_ROLL_FREQUENCY)
                        * this.WOBBLE_ROLL_AMPLITUDE;
      const swayX = Math.sin(this.wobbleTime * Math.PI * 2 * this.WOBBLE_SWAY_FREQUENCY)
                    * this.WOBBLE_SWAY_AMPLITUDE;
      const swayY = Math.cos(this.wobbleTime * Math.PI * 2 * this.WOBBLE_SWAY_FREQUENCY * 0.7)
                    * this.WOBBLE_SWAY_AMPLITUDE * 0.5;

      this.camera.rotateZ(rollAngle);
      this.camera.position.x += swayX;
      this.camera.position.y += swayY;
    }

    // Wall fade-through (after camera position is finalized)
    this.updateWallFade(playerPos);
  }

  /**
   * Set the player's facing angle so the camera auto-orbits behind them.
   * Pass null when player is stationary to let the camera hold position.
   */
  setPlayerFacing(angle: number | null): void {
    this.playerFacingYaw = angle;
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
    this.pitch = 0.35;
    this.currentDistance = this.config.targetDistance;
    this.restoreAllFadedMeshes();
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
   * Set size-based distance multiplier (called when player size changes)
   */
  setSizeDistanceMultiplier(multiplier: number): void {
    this.targetSizeDistanceMultiplier = multiplier;
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
   */
  shake(intensity: number): void {
    this.shakeIntensity = Math.min(1.0, this.shakeIntensity + intensity);
  }

  /**
   * Kick the FOV for speed/impact effects
   */
  kickFOV(targetFOV: number, duration: number): void {
    this.targetFOV = targetFOV;
    this.fovKickDuration = duration;
    this.fovKickTimer = 0;
  }

  /**
   * Enable/disable underwater wobble effect
   */
  setUnderwaterWobble(enabled: boolean): void {
    if (this.underwaterWobbleEnabled !== enabled) {
      this.underwaterWobbleEnabled = enabled;
      if (enabled) {
        this.wobbleTime = 0;
      }
    }
  }

  /**
   * Enable/disable dialogue focus mode
   */
  setDialogueFocus(enabled: boolean): void {
    this.dialogueFocusEnabled = enabled;
  }

  /**
   * Trigger a landing dip effect
   */
  dip(intensity: number): void {
    const dipAmount = -intensity * 0.3;
    this.dipOffset = dipAmount;
    this.dipVelocity = 0;
  }

  /**
   * Dispose of the camera controller and remove event listeners
   */
  dispose(): void {
    this.restoreAllFadedMeshes();
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }
}
