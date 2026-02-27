/**
 * PlayerController - Modern 3rd-person movement
 *
 * Handles player physics including:
 * - Momentum/acceleration (no instant velocity changes)
 * - Jump + double jump
 * - Swimming
 * - Coyote time and jump buffering
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { InputManager } from '../engine/InputManager';
import { AnimationStateManager } from '../animation/AnimationStateManager';
import type { AnimationState } from '../animation/AnimationStateManager';
import type { SurfaceType } from '../audio/AudioManager';

export interface PlayerControllerCallbacks {
  onJumpAnticipation?: (isDoubleJump: boolean) => void;
  onJump?: (isDoubleJump: boolean) => void;
  onLand?: (fallSpeed: number, surface: SurfaceType) => void;
  onFootstep?: (surface: SurfaceType) => void;
  onSpeedBoost?: () => void;
  onSpeedBoostActive?: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  onWaterEnter?: (position: THREE.Vector3, surfaceY: number) => void;
  onWaterExit?: (position: THREE.Vector3, surfaceY: number) => void;
  onSwimmingSplash?: (position: THREE.Vector3, surfaceY: number) => void;
}

export interface AirCurrentZoneRef {
  bounds: THREE.Box3;
  force: number;
}

export interface WaterZoneRef {
  bounds: THREE.Box3;
  surfaceY: number;
  current: THREE.Vector3;
}

export interface SpeedBoostZoneRef {
  bounds: THREE.Box3;
  direction: THREE.Vector3;
  force: number;
}

export class PlayerController {
  // Physics body reference
  private playerBody: RAPIER.RigidBody;
  private world: RAPIER.World;

  // Momentum state
  private momentum: THREE.Vector3 = new THREE.Vector3();

  // Ground state
  private isGrounded: boolean = false;
  private wasGrounded: boolean = false;
  private lastGroundedTime: number = 0;

  // Jump state
  private jumpCount: number = 0;
  private jumpBufferTime: number = 0;
  private wasJumpPressed: boolean = false;

  // Landing lockout state (prevents instant re-jump after hard landings)
  private landingLockout: number = 0;

  // Jump anticipation state (brief squash before jump)
  private pendingJump: boolean = false;
  private pendingJumpIsDouble: boolean = false;
  private pendingJumpForce: number = 0;
  private jumpAnticipationTimer: number = 0;
  private readonly JUMP_ANTICIPATION_DURATION: number = 0.05; // 50ms squash before jump

  // Water/swimming state
  private inWater: boolean = false;
  private wasInWater: boolean = false;
  private waterSurfaceY: number = 0;
  private currentWaterCurrent: THREE.Vector3 = new THREE.Vector3();
  private swimmingSplashTimer: number = 0;
  private readonly SWIMMING_SPLASH_INTERVAL: number = 0.4; // Seconds between swim splashes

  // Tuning constants - movement (smooth, controlled modern feel)
  private readonly GROUND_ACCEL = 2.0;      // Gentle ramp-up
  private readonly AIR_ACCEL = 0.5;         // Moderate air control
  private readonly GROUND_FRICTION = 0.80;  // Smooth deceleration with slight glide
  private readonly AIR_FRICTION = 0.97;     // Maintain air momentum
  private readonly MAX_SPEED = 11;          // Controlled top speed
  private readonly MIN_SPEED_THRESHOLD = 0.1;

  // Tuning constants - jumping
  private readonly JUMP_FORCE = 11;
  private readonly DOUBLE_JUMP_FORCE = 9.5;

  // Tuning constants - landing lockout
  private readonly HARD_LANDING_THRESHOLD = 10; // fall speed that triggers lockout
  private readonly LANDING_LOCKOUT_DURATION = 0.05; // 50ms lockout after hard landing

  // Tuning constants - timing
  private readonly COYOTE_TIME = 150; // ms - grace period after leaving ground
  private readonly JUMP_BUFFER_TIME = 100; // ms - store jump input

  // Footstep timing - scales with movement speed
  // Walking (~0.4s), running (~0.25s at RUN_SPEED_THRESHOLD), max speed (~0.18s)
  private footstepTimer: number = 0;
  private readonly FOOTSTEP_INTERVAL_WALK = 0.4;    // Slow walking
  private readonly FOOTSTEP_INTERVAL_MAX = 0.18;    // Max speed

  // Current surface type for footstep sounds
  private currentSurface: SurfaceType = 'grass';

  // Camera yaw for world-relative movement
  private cameraYaw: number = 0;

  // Callbacks
  private callbacks: PlayerControllerCallbacks = {};

  // Size manager integration
  private speedMultiplier: number = 1;
  private jumpMultiplier: number = 1;
  private groundCheckDistance: number = 1.1;

  // Level-specific zones
  private airCurrentZones: AirCurrentZoneRef[] = [];
  private waterZones: WaterZoneRef[] = [];
  private speedBoostZones: SpeedBoostZoneRef[] = [];
  private boostCooldown: number = 0;

  // Animation state manager (optional - set when model has animations)
  private animationManager: AnimationStateManager | null = null;

  // Animation thresholds
  private readonly WALK_SPEED_THRESHOLD = 2;
  private readonly RUN_SPEED_THRESHOLD = 8;

  // Pre-allocated objects to avoid per-frame allocations
  private playerPosCache: THREE.Vector3 = new THREE.Vector3();
  private callbackPosCache: THREE.Vector3 = new THREE.Vector3();
  private boostDirCache: THREE.Vector3 = new THREE.Vector3();
  private velocityCache: RAPIER.Vector3 | null = null;
  private groundCheckRay: RAPIER.Ray | null = null;
  private groundCheckDir: RAPIER.Vector3 | null = null;

  constructor(world: RAPIER.World, playerBody: RAPIER.RigidBody) {
    this.world = world;
    this.playerBody = playerBody;

    // Initialize RAPIER objects (must be done after RAPIER.init())
    this.velocityCache = new RAPIER.Vector3(0, 0, 0);
    this.groundCheckDir = new RAPIER.Vector3(0, -1, 0);
    this.groundCheckRay = new RAPIER.Ray(
      new RAPIER.Vector3(0, 0, 0),
      this.groundCheckDir
    );
  }

  /**
   * Set callback handlers for audio/visual feedback
   */
  setCallbacks(callbacks: PlayerControllerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set camera yaw for world-relative movement
   */
  setCameraYaw(yaw: number): void {
    this.cameraYaw = yaw;
  }

  /**
   * Set speed/jump multipliers (from SizeManager)
   */
  setMultipliers(speed: number, jump: number): void {
    this.speedMultiplier = speed;
    this.jumpMultiplier = jump;
  }

  /**
   * Set ground check distance (based on capsule height)
   */
  setGroundCheckDistance(distance: number): void {
    this.groundCheckDistance = distance;
  }

  /**
   * Set current surface type for footstep sounds
   */
  setCurrentSurface(surface: SurfaceType): void {
    this.currentSurface = surface;
  }

  /**
   * Get current surface type
   */
  getCurrentSurface(): SurfaceType {
    return this.currentSurface;
  }

  /**
   * Set air current zones for the current level
   */
  setAirCurrentZones(zones: AirCurrentZoneRef[]): void {
    this.airCurrentZones = zones;
  }

  /**
   * Set water zones for the current level
   */
  setWaterZones(zones: WaterZoneRef[]): void {
    this.waterZones = zones;
  }

  /**
   * Set speed boost zones for the current level
   */
  setSpeedBoostZones(zones: SpeedBoostZoneRef[]): void {
    this.speedBoostZones = zones;
  }

  /**
   * Set animation state manager for skeletal animation
   */
  setAnimationManager(manager: AnimationStateManager): void {
    this.animationManager = manager;

    // Set up auto-transition callback
    manager.setOnAnimationComplete((state) => {
      // After landing animation completes, check current state
      if (state === 'land') {
        this.updateAnimationState();
      }
    });
  }

  /**
   * Set animation playback speed (for size changes)
   */
  setAnimationSpeed(scale: number): void {
    this.animationManager?.setSpeedScale(scale);
  }

  /**
   * Main update - call each frame
   */
  update(dt: number, input: InputManager): void {
    const vel = this.playerBody.linvel();
    const now = performance.now();

    // Update ground state
    this.wasGrounded = this.isGrounded;
    this.isGrounded = this.checkGrounded();

    // Track grounded time for coyote time
    if (this.isGrounded) {
      this.lastGroundedTime = now;
      this.jumpCount = 0;
    }

    // Decrement lockout timers
    if (this.landingLockout > 0) {
      this.landingLockout -= dt;
    }
    if (this.boostCooldown > 0) {
      this.boostCooldown -= dt;
    }

    // Process pending jump after anticipation squash
    if (this.pendingJump) {
      this.jumpAnticipationTimer -= dt;
      if (this.jumpAnticipationTimer <= 0) {
        this.executePendingJump();
      }
    }

    // Check if in water
    this.checkWaterZones();

    // Landing detection (not while swimming)
    if (this.isGrounded && !this.wasGrounded && !this.inWater) {
      const fallSpeed = Math.abs(vel.y);
      this.callbacks.onLand?.(fallSpeed, this.currentSurface);
      // Trigger land animation
      this.animationManager?.setState('land');

      // Apply landing lockout for hard landings to prevent instant re-jump
      if (fallSpeed > this.HARD_LANDING_THRESHOLD) {
        this.landingLockout = this.LANDING_LOCKOUT_DURATION;
      }
    }

    // Get movement input
    let moveX = 0;
    let moveZ = 0;
    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    // Normalize diagonal movement
    const inputLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (inputLength > 0) {
      moveX /= inputLength;
      moveZ /= inputLength;
    }

    // Transform to world space based on camera
    const cos = Math.cos(-this.cameraYaw);
    const sin = Math.sin(-this.cameraYaw);
    const worldX = moveX * cos - moveZ * sin;
    const worldZ = moveX * sin + moveZ * cos;

    // Handle swimming if in water
    if (this.inWater) {
      this.applySwimmingMovement(worldX, worldZ, input, dt);
      this.updateAnimationState();
      return;
    }

    // Apply momentum-based movement
    this.applyMovement(worldX, worldZ);

    // Apply air current forces when falling
    if (!this.isGrounded) {
      this.applyAirCurrents();
    }

    // Check for speed boosts
    this.checkSpeedBoosts();

    // Handle jumping
    this.handleJump(input, now);

    // Handle footsteps - interval scales with movement speed
    if (this.isGrounded && inputLength > 0) {
      this.footstepTimer += dt;
      const footstepInterval = this.getFootstepInterval();
      if (this.footstepTimer >= footstepInterval) {
        this.callbacks.onFootstep?.(this.currentSurface);
        this.footstepTimer = 0;
      }
    } else {
      this.footstepTimer = 0;
    }

    // Update animation state based on current movement
    this.updateAnimationState();
  }

  /**
   * Apply momentum-based movement
   */
  private applyMovement(inputX: number, inputZ: number): void {
    const vel = this.playerBody.linvel();

    // Choose acceleration and friction based on ground state
    const accel = this.isGrounded ? this.GROUND_ACCEL : this.AIR_ACCEL;
    const friction = this.isGrounded ? this.GROUND_FRICTION : this.AIR_FRICTION;

    // Apply input as acceleration
    this.momentum.x += inputX * accel * this.speedMultiplier;
    this.momentum.z += inputZ * accel * this.speedMultiplier;

    // Apply friction
    this.momentum.x *= friction;
    this.momentum.z *= friction;

    // Kill tiny velocities
    if (Math.abs(this.momentum.x) < this.MIN_SPEED_THRESHOLD) this.momentum.x = 0;
    if (Math.abs(this.momentum.z) < this.MIN_SPEED_THRESHOLD) this.momentum.z = 0;

    // Clamp to max speed
    const speed = Math.sqrt(this.momentum.x ** 2 + this.momentum.z ** 2);
    const maxSpeed = this.MAX_SPEED * this.speedMultiplier;
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      this.momentum.x *= scale;
      this.momentum.z *= scale;
    }

    // Apply to physics body (reuse cached velocity)
    this.velocityCache!.x = this.momentum.x;
    this.velocityCache!.y = vel.y;
    this.velocityCache!.z = this.momentum.z;
    this.playerBody.setLinvel(this.velocityCache!, true);
  }

  /**
   * Apply air current forces when inside zones
   */
  private applyAirCurrents(): void {
    if (this.airCurrentZones.length === 0) return;

    const pos = this.playerBody.translation();
    this.playerPosCache.set(pos.x, pos.y, pos.z);
    const vel = this.playerBody.linvel();

    for (const zone of this.airCurrentZones) {
      if (zone.bounds.containsPoint(this.playerPosCache)) {
        // Apply vertical force from air current
        // Negative force = updraft (slows falling), positive = downdraft
        this.velocityCache!.x = vel.x;
        this.velocityCache!.y = vel.y + zone.force;
        this.velocityCache!.z = vel.z;
        this.playerBody.setLinvel(this.velocityCache!, true);
        break;  // Only apply one air current at a time
      }
    }
  }

  /**
   * Check for speed boost zones and apply boost
   */
  private checkSpeedBoosts(): void {
    if (this.speedBoostZones.length === 0) return;

    const pos = this.playerBody.translation();
    this.playerPosCache.set(pos.x, pos.y, pos.z);

    for (const zone of this.speedBoostZones) {
      if (zone.bounds.containsPoint(this.playerPosCache)) {
        // Emit trail particles while in boost zone (throttled in ParticleManager)
        this.callbackPosCache.set(pos.x, pos.y, pos.z);
        this.boostDirCache.copy(zone.direction);
        this.callbacks.onSpeedBoostActive?.(this.callbackPosCache, this.boostDirCache);

        // Only apply boost force if cooldown has elapsed
        if (this.boostCooldown > 0) break;

        // Apply boost in the zone's direction
        this.momentum.x += zone.direction.x * zone.force;
        this.momentum.z += zone.direction.z * zone.force;

        // Also add vertical boost if specified
        if (zone.direction.y !== 0) {
          const vel = this.playerBody.linvel();
          this.velocityCache!.x = this.momentum.x;
          this.velocityCache!.y = vel.y + zone.direction.y * zone.force * 0.5;
          this.velocityCache!.z = this.momentum.z;
          this.playerBody.setLinvel(this.velocityCache!, true);
        }

        // Set cooldown to prevent repeated boosts
        this.boostCooldown = 0.5;

        // Notify callback for FOV kick on initial boost
        this.callbacks.onSpeedBoost?.();
        break;
      }
    }
  }


  /**
   * Check if player is in a water zone
   */
  private checkWaterZones(): void {
    // Store previous state for entry detection
    this.wasInWater = this.inWater;

    if (this.waterZones.length === 0) {
      this.inWater = false;
      return;
    }

    const pos = this.playerBody.translation();
    this.playerPosCache.set(pos.x, pos.y, pos.z);

    for (const zone of this.waterZones) {
      if (zone.bounds.containsPoint(this.playerPosCache)) {
        this.inWater = true;
        this.waterSurfaceY = zone.surfaceY;
        this.currentWaterCurrent.copy(zone.current);

        // Detect water entry (just entered water)
        if (!this.wasInWater) {
          // Create splash position at water surface level
          this.callbackPosCache.set(pos.x, this.waterSurfaceY, pos.z);
          this.callbacks.onWaterEnter?.(this.callbackPosCache, this.waterSurfaceY);
          // Reset swimming splash timer so we don't immediately spawn swim splash
          this.swimmingSplashTimer = 0;
        }
        return;
      }
    }

    // Detect water exit (just left water)
    if (this.wasInWater) {
      // Create splash position at water surface level
      this.callbackPosCache.set(pos.x, this.waterSurfaceY, pos.z);
      this.callbacks.onWaterExit?.(this.callbackPosCache, this.waterSurfaceY);
    }

    this.inWater = false;
  }

  /**
   * Apply swimming movement when in water
   */
  private applySwimmingMovement(
    inputX: number,
    inputZ: number,
    input: InputManager,
    dt: number
  ): void {
    const pos = this.playerBody.translation();

    // Swimming acceleration (slower than ground)
    const swimAccel = 0.4 * this.speedMultiplier;
    const swimFriction = 0.92;  // Water drag

    // Horizontal movement
    this.momentum.x += inputX * swimAccel;
    this.momentum.z += inputZ * swimAccel;

    // Vertical swimming controls
    if (input.jump) {
      // Swim up
      this.momentum.y = (this.momentum.y || 0) + 0.6;
    } else if (input.isKeyDown('shift') || input.isKeyDown('control')) {
      // Dive down
      this.momentum.y = (this.momentum.y || 0) - 0.4;
    } else {
      // Buoyancy - gently push toward surface
      const depthBelowSurface = this.waterSurfaceY - pos.y;
      const buoyancy = Math.max(0, depthBelowSurface) * 0.15;
      this.momentum.y = (this.momentum.y || 0) + buoyancy;
    }

    // Apply water current
    this.momentum.x += this.currentWaterCurrent.x * 0.1;
    this.momentum.y += this.currentWaterCurrent.y * 0.1;
    this.momentum.z += this.currentWaterCurrent.z * 0.1;

    // Apply water drag to all axes
    this.momentum.x *= swimFriction;
    this.momentum.y *= swimFriction;
    this.momentum.z *= swimFriction;

    // Clamp speeds
    const maxSwimSpeed = 8 * this.speedMultiplier;
    const horizSpeed = Math.sqrt(this.momentum.x ** 2 + this.momentum.z ** 2);
    if (horizSpeed > maxSwimSpeed) {
      const scale = maxSwimSpeed / horizSpeed;
      this.momentum.x *= scale;
      this.momentum.z *= scale;
    }
    this.momentum.y = Math.max(-10, Math.min(10, this.momentum.y));

    // Apply to physics body (override gravity effect, reuse cached velocity)
    this.velocityCache!.x = this.momentum.x;
    this.velocityCache!.y = this.momentum.y;
    this.velocityCache!.z = this.momentum.z;
    this.playerBody.setLinvel(this.velocityCache!, true);

    // Reset jump count when in water (can jump out of water)
    if (pos.y > this.waterSurfaceY - 0.5) {
      this.jumpCount = 0;
    }

    // Swimming splash particles when moving near surface
    const isNearSurface = pos.y > this.waterSurfaceY - 1.5;
    const isMoving = horizSpeed > 2 || Math.abs(this.momentum.y) > 1;

    if (isNearSurface && isMoving) {
      this.swimmingSplashTimer += dt;
      if (this.swimmingSplashTimer >= this.SWIMMING_SPLASH_INTERVAL) {
        this.callbackPosCache.set(pos.x, this.waterSurfaceY, pos.z);
        this.callbacks.onSwimmingSplash?.(this.callbackPosCache, this.waterSurfaceY);
        this.swimmingSplashTimer = 0;
      }
    }
  }

  /**
   * Handle jump input with coyote time and buffering
   */
  private handleJump(input: InputManager, now: number): void {
    const jumpPressed = input.jump;
    const justPressed = jumpPressed && !this.wasJumpPressed;
    this.wasJumpPressed = jumpPressed;

    // Buffer jump input
    if (justPressed) {
      this.jumpBufferTime = now;
    }

    // Check if we can jump (within coyote time or grounded)
    const canCoyoteJump = (now - this.lastGroundedTime) < this.COYOTE_TIME;
    const hasBufferedJump = (now - this.jumpBufferTime) < this.JUMP_BUFFER_TIME;
    const wantsToJump = justPressed || hasBufferedJump;

    // Ignore jump input during landing lockout (prevents instant re-jump after hard landings)
    if (this.landingLockout > 0) {
      return;
    }

    // Normal jump or double jump
    if (wantsToJump && this.jumpCount < 2 && !this.pendingJump) {
      // First jump requires being grounded or coyote time
      if (this.jumpCount === 0 && !this.isGrounded && !canCoyoteJump) {
        return;
      }

      const isDoubleJump = this.jumpCount === 1;
      const force = isDoubleJump ? this.DOUBLE_JUMP_FORCE : this.JUMP_FORCE;

      // Double jumps are instant (already in air), first jumps get anticipation squash
      if (isDoubleJump) {
        this.performJump(force * this.jumpMultiplier, isDoubleJump);
        this.jumpCount++;
      } else {
        // Queue the jump with anticipation
        this.pendingJump = true;
        this.pendingJumpIsDouble = false;
        this.pendingJumpForce = force * this.jumpMultiplier;
        this.jumpAnticipationTimer = this.JUMP_ANTICIPATION_DURATION;
        this.callbacks.onJumpAnticipation?.(false);
      }
      this.jumpBufferTime = 0;
    }
  }

  /**
   * Execute the pending jump after anticipation squash
   */
  private executePendingJump(): void {
    this.pendingJump = false;
    this.performJump(this.pendingJumpForce, this.pendingJumpIsDouble);
    this.jumpCount++;
  }

  /**
   * Perform a jump
   */
  private performJump(force: number, isDoubleJump: boolean): void {
    const vel = this.playerBody.linvel();
    this.velocityCache!.x = vel.x;
    this.velocityCache!.y = force;
    this.velocityCache!.z = vel.z;
    this.playerBody.setLinvel(this.velocityCache!, true);
    this.callbacks.onJump?.(isDoubleJump);
  }

  /**
   * Check if player is grounded using raycast (reuses pre-allocated ray)
   */
  private checkGrounded(): boolean {
    const pos = this.playerBody.translation();
    // Update ray origin (direction is always down, set in constructor)
    this.groundCheckRay!.origin.x = pos.x;
    this.groundCheckRay!.origin.y = pos.y;
    this.groundCheckRay!.origin.z = pos.z;

    const hit = this.world.castRay(this.groundCheckRay!, this.groundCheckDistance, true);
    return hit !== null;
  }

  /**
   * Get current horizontal speed
   */
  getSpeed(): number {
    return Math.sqrt(this.momentum.x ** 2 + this.momentum.z ** 2);
  }

  /**
   * Get footstep interval based on current speed
   * Faster movement = shorter interval between footsteps
   */
  private getFootstepInterval(): number {
    const speed = this.getSpeed();

    // Below walk threshold, use walk interval
    if (speed <= this.WALK_SPEED_THRESHOLD) {
      return this.FOOTSTEP_INTERVAL_WALK;
    }

    // At or above max speed, use max interval
    if (speed >= this.MAX_SPEED) {
      return this.FOOTSTEP_INTERVAL_MAX;
    }

    // Interpolate between walk and max based on speed
    // Map speed from [WALK_SPEED_THRESHOLD, MAX_SPEED] to [0, 1]
    const t = (speed - this.WALK_SPEED_THRESHOLD) / (this.MAX_SPEED - this.WALK_SPEED_THRESHOLD);
    // Lerp from walk interval to max interval
    return this.FOOTSTEP_INTERVAL_WALK + t * (this.FOOTSTEP_INTERVAL_MAX - this.FOOTSTEP_INTERVAL_WALK);
  }

  /**
   * Get current momentum for external use (read-only reference, do not mutate)
   */
  getMomentum(): THREE.Vector3 {
    return this.momentum;
  }

  /**
   * Check if grounded
   */
  getIsGrounded(): boolean {
    return this.isGrounded;
  }

  /**
   * Check if in water
   */
  getIsInWater(): boolean {
    return this.inWater;
  }

  /**
   * Check if underwater (below the water surface)
   * Used for underwater camera effects
   */
  isUnderwater(): boolean {
    if (!this.inWater) return false;
    const pos = this.playerBody.translation();
    // Consider underwater if player center is below the water surface
    return pos.y < this.waterSurfaceY;
  }

  /**
   * Reset state (for respawning)
   */
  reset(): void {
    this.momentum.set(0, 0, 0);
    this.jumpCount = 0;
    this.landingLockout = 0;
    this.animationManager?.setState('idle');
  }

  /**
   * Update animation state based on current movement
   */
  private updateAnimationState(): void {
    if (!this.animationManager) return;

    // In water - could add swim animation here
    if (this.inWater) {
      // For now just use idle/walk in water
      const speed = this.getSpeed();
      if (speed > this.WALK_SPEED_THRESHOLD) {
        this.animationManager.setState('walk');
      } else {
        this.animationManager.setState('idle');
      }
      return;
    }

    // Airborne states
    if (!this.isGrounded) {
      const vel = this.playerBody.linvel();
      if (vel.y > 2) {
        // Rising - jump animation
        this.animationManager.setState('jump');
      } else {
        // Falling
        this.animationManager.setState('fall');
      }
      return;
    }

    // Grounded states based on speed
    const speed = this.getSpeed();
    if (speed > this.RUN_SPEED_THRESHOLD) {
      this.animationManager.setState('run');
    } else if (speed > this.WALK_SPEED_THRESHOLD) {
      this.animationManager.setState('walk');
    } else {
      this.animationManager.setState('idle');
    }
  }

  /**
   * Update animation mixer (call each frame after update())
   */
  updateAnimation(dt: number): void {
    this.animationManager?.update(dt);
  }

  /**
   * Get current animation state (for debugging/UI)
   */
  getAnimationState(): AnimationState | null {
    return this.animationManager?.getCurrentState() ?? null;
  }
}
