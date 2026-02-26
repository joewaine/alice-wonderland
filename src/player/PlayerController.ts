/**
 * PlayerController - Momentum-based movement with N64-style moveset
 *
 * Handles player physics including:
 * - Momentum/acceleration (no instant velocity changes)
 * - Double jump
 * - Ground pound
 * - Long jump
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
  onGroundPound?: () => void;
  onGroundPoundLand?: (position: THREE.Vector3) => void;
  onLongJump?: () => void;
  onFootstep?: (surface: SurfaceType) => void;
  onSpeedBoost?: () => void;
  onSpeedBoostActive?: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  onWaterEnter?: (position: THREE.Vector3, surfaceY: number) => void;
  onSwimmingSplash?: (position: THREE.Vector3, surfaceY: number) => void;
  onWallSlide?: (position: THREE.Vector3, wallNormal: THREE.Vector3) => void;
  onWallJump?: (position: THREE.Vector3, wallNormal: THREE.Vector3) => void;
  onLedgeGrab?: (position: THREE.Vector3) => void;
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

  // Ground pound state
  private isGroundPounding: boolean = false;
  private groundPoundLockout: number = 0;
  private groundPoundWindupTimer: number = 0;
  private readonly GROUND_POUND_WINDUP_DURATION: number = 0.08; // Brief hover at apex before dive

  // Long jump state
  private isLongJumping: boolean = false;

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

  // Wall slide state
  private isWallSliding: boolean = false;
  private wallSlideNormal: THREE.Vector3 = new THREE.Vector3();
  private wallSlideTimer: number = 0;
  private readonly WALL_SLIDE_PARTICLE_INTERVAL: number = 0.1; // Seconds between wall slide particles
  private readonly WALL_CHECK_DISTANCE: number = 0.6; // Raycast distance for wall detection
  private readonly WALL_SLIDE_GRAVITY_SCALE: number = 0.4; // Reduced gravity when wall sliding

  // Wall jump tuning
  private readonly WALL_JUMP_VERTICAL: number = 12;
  private readonly WALL_JUMP_HORIZONTAL: number = 8;

  // Ledge grab state
  private isLedgeGrabbing: boolean = false;
  private wasLedgeGrabbing: boolean = false;
  private ledgeGrabPosition: THREE.Vector3 = new THREE.Vector3();
  private readonly LEDGE_CHECK_HEIGHT: number = 1.0; // Height above player to check for ledge
  private readonly LEDGE_CHECK_DEPTH: number = 0.8; // Distance forward to check for ledge
  private ledgeCheckRay: RAPIER.Ray | null = null;
  private ledgeCheckDir: RAPIER.Vector3 | null = null;

  // Tuning constants - movement (snappy, responsive feel)
  private readonly GROUND_ACCEL = 1.8;      // Fast acceleration
  private readonly AIR_ACCEL = 0.6;         // Good air control
  private readonly GROUND_FRICTION = 0.75;  // Quick stops
  private readonly AIR_FRICTION = 0.96;     // Maintain air momentum
  private readonly MAX_SPEED = 16;          // Slightly faster top speed
  private readonly MIN_SPEED_THRESHOLD = 0.1;

  // Tuning constants - jumping
  private readonly JUMP_FORCE = 14;
  private readonly DOUBLE_JUMP_FORCE = 12;
  private readonly LONG_JUMP_VERTICAL = 10;
  private readonly LONG_JUMP_HORIZONTAL_BOOST = 8;
  private readonly LONG_JUMP_SPEED_THRESHOLD = 5;

  // Tuning constants - ground pound
  private readonly GROUND_POUND_FORCE = -30;
  private readonly GROUND_POUND_LOCKOUT = 0.2; // seconds after landing

  // Tuning constants - landing lockout
  private readonly HARD_LANDING_THRESHOLD = 10; // fall speed that triggers lockout
  private readonly LANDING_LOCKOUT_DURATION = 0.05; // 50ms lockout after hard landing

  // Tuning constants - timing
  private readonly COYOTE_TIME = 150; // ms - grace period after leaving ground
  private readonly JUMP_BUFFER_TIME = 100; // ms - store jump input

  // Footstep timing
  private footstepTimer: number = 0;
  private readonly FOOTSTEP_INTERVAL = 0.3;

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
  private wallNormalCache: THREE.Vector3 = new THREE.Vector3();
  private boostDirCache: THREE.Vector3 = new THREE.Vector3();
  private velocityCache: RAPIER.Vector3 | null = null;
  private groundCheckRay: RAPIER.Ray | null = null;
  private groundCheckDir: RAPIER.Vector3 | null = null;
  private wallCheckRay: RAPIER.Ray | null = null;
  private wallCheckDir: RAPIER.Vector3 | null = null;

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
    this.wallCheckDir = new RAPIER.Vector3(1, 0, 0);
    this.wallCheckRay = new RAPIER.Ray(
      new RAPIER.Vector3(0, 0, 0),
      this.wallCheckDir
    );
    this.ledgeCheckDir = new RAPIER.Vector3(0, -1, 0);
    this.ledgeCheckRay = new RAPIER.Ray(
      new RAPIER.Vector3(0, 0, 0),
      this.ledgeCheckDir
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
      this.isLongJumping = false;

      // End ground pound on landing
      if (this.isGroundPounding) {
        this.isGroundPounding = false;
        this.groundPoundLockout = this.GROUND_POUND_LOCKOUT;

        // Callback for breaking platforms (use cached vector)
        const pos = this.playerBody.translation();
        this.callbackPosCache.set(pos.x, pos.y, pos.z);
        this.callbacks.onGroundPoundLand?.(this.callbackPosCache);
      }
    }

    // Decrement lockout timers
    if (this.groundPoundLockout > 0) {
      this.groundPoundLockout -= dt;
    }
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

    // Handle ground pound (crouch in air, not in water)
    const isCrouching = input.isKeyDown('shift') || input.isKeyDown('control');
    if (isCrouching && !this.isGrounded && !this.isGroundPounding && this.groundPoundLockout <= 0) {
      this.startGroundPound();
    }

    // Skip normal movement during ground pound
    if (this.isGroundPounding) {
      // Process windup timer (hover at apex before diving)
      if (this.groundPoundWindupTimer > 0) {
        this.groundPoundWindupTimer -= dt;
        // Keep player frozen during windup
        this.velocityCache!.x = 0;
        this.velocityCache!.y = 0;
        this.velocityCache!.z = 0;
        this.playerBody.setLinvel(this.velocityCache!, true);

        // Execute dive when windup completes
        if (this.groundPoundWindupTimer <= 0) {
          this.executeGroundPoundDive();
        }
        return;
      }
      // But still apply air currents even during ground pound (slows the slam)
      this.applyAirCurrents();
      return;
    }

    // Apply momentum-based movement
    this.applyMovement(worldX, worldZ);

    // Apply air current forces when falling
    if (!this.isGrounded) {
      this.applyAirCurrents();
    }

    // Check for wall slide (only when falling and not grounded)
    this.checkWallSlide(dt);

    // Check for ledge grab (when wall sliding near a ledge)
    this.checkLedgeGrab();

    // Check for speed boosts
    this.checkSpeedBoosts();

    // Handle jumping
    this.handleJump(input, isCrouching, now);

    // Handle footsteps
    if (this.isGrounded && inputLength > 0) {
      this.footstepTimer += dt;
      if (this.footstepTimer >= this.FOOTSTEP_INTERVAL) {
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
   * Check for wall slide and emit particles
   * Wall slide occurs when: not grounded, falling (negative y velocity), and touching a wall
   */
  private checkWallSlide(dt: number): void {
    // Only check when airborne and falling
    if (this.isGrounded || this.isGroundPounding || this.inWater) {
      this.isWallSliding = false;
      this.wallSlideTimer = 0;
      return;
    }

    const vel = this.playerBody.linvel();

    // Must be falling (not rising from a jump)
    if (vel.y > 0) {
      this.isWallSliding = false;
      this.wallSlideTimer = 0;
      return;
    }

    // Check for wall contact
    const wallNormal = this.checkWallContact();
    if (wallNormal === null) {
      this.isWallSliding = false;
      this.wallSlideTimer = 0;
      return;
    }

    // We're wall sliding!
    this.isWallSliding = true;
    this.wallSlideNormal.copy(wallNormal);

    // Apply reduced gravity (slow the descent)
    const reducedGravityVel = vel.y * this.WALL_SLIDE_GRAVITY_SCALE;
    if (vel.y < reducedGravityVel) {
      // Cap the fall speed when wall sliding
      this.velocityCache!.x = vel.x;
      this.velocityCache!.y = Math.max(vel.y, -5);  // Max fall speed when wall sliding
      this.velocityCache!.z = vel.z;
      this.playerBody.setLinvel(this.velocityCache!, true);
    }

    // Emit wall slide particles on a throttled interval
    this.wallSlideTimer += dt;
    if (this.wallSlideTimer >= this.WALL_SLIDE_PARTICLE_INTERVAL) {
      this.wallSlideTimer = 0;

      // Get position for particle spawn (at wall contact point)
      const pos = this.playerBody.translation();
      this.callbackPosCache.set(
        pos.x - wallNormal.x * 0.5,  // Offset toward wall
        pos.y,
        pos.z - wallNormal.z * 0.5
      );

      this.callbacks.onWallSlide?.(this.callbackPosCache, this.wallSlideNormal);
    }
  }

  /**
   * Check for ledge grab opportunity
   * Ledge grab occurs when: not grounded, touching wall, and there's a ledge above
   */
  private checkLedgeGrab(): void {
    // Store previous state for grab detection
    this.wasLedgeGrabbing = this.isLedgeGrabbing;

    // Only check when wall sliding (already touching a wall and falling)
    if (!this.isWallSliding || this.isGrounded || this.isGroundPounding || this.inWater) {
      this.isLedgeGrabbing = false;
      return;
    }

    const pos = this.playerBody.translation();

    // Check if there's empty space at head level (where we'd grab)
    // Then check if there's solid ground just above that (the ledge surface)
    const checkHeight = pos.y + this.LEDGE_CHECK_HEIGHT;

    // Raycast forward at ledge height to see if there's open space
    const forwardX = -this.wallSlideNormal.x;
    const forwardZ = -this.wallSlideNormal.z;

    this.ledgeCheckRay!.origin.x = pos.x + forwardX * 0.3;
    this.ledgeCheckRay!.origin.y = checkHeight;
    this.ledgeCheckRay!.origin.z = pos.z + forwardZ * 0.3;
    this.ledgeCheckDir!.x = forwardX;
    this.ledgeCheckDir!.y = 0;
    this.ledgeCheckDir!.z = forwardZ;
    this.ledgeCheckRay!.dir = this.ledgeCheckDir!;

    const forwardHit = this.world.castRay(this.ledgeCheckRay!, this.LEDGE_CHECK_DEPTH, true);

    // If there's no obstruction at head level, check for ground above
    if (forwardHit === null) {
      // Raycast down from above the ledge to find the surface
      this.ledgeCheckRay!.origin.x = pos.x + forwardX * this.LEDGE_CHECK_DEPTH;
      this.ledgeCheckRay!.origin.y = checkHeight + 0.5;
      this.ledgeCheckRay!.origin.z = pos.z + forwardZ * this.LEDGE_CHECK_DEPTH;
      this.ledgeCheckDir!.x = 0;
      this.ledgeCheckDir!.y = -1;
      this.ledgeCheckDir!.z = 0;
      this.ledgeCheckRay!.dir = this.ledgeCheckDir!;

      const downHit = this.world.castRay(this.ledgeCheckRay!, 1.0, true);

      if (downHit !== null) {
        // Found a ledge! Trigger grab
        if (!this.wasLedgeGrabbing) {
          // Just started grabbing - emit shimmer particles
          const grabY = checkHeight + 0.5 - downHit.timeOfImpact;
          this.ledgeGrabPosition.set(
            pos.x + forwardX * (this.LEDGE_CHECK_DEPTH * 0.5),
            grabY,
            pos.z + forwardZ * (this.LEDGE_CHECK_DEPTH * 0.5)
          );
          this.callbacks.onLedgeGrab?.(this.ledgeGrabPosition);
        }
        this.isLedgeGrabbing = true;

        // Hold position while grabbing (freeze velocity)
        this.velocityCache!.x = 0;
        this.velocityCache!.y = 0;
        this.velocityCache!.z = 0;
        this.playerBody.setLinvel(this.velocityCache!, true);
        return;
      }
    }

    this.isLedgeGrabbing = false;
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
  private handleJump(input: InputManager, isCrouching: boolean, now: number): void {
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

    // Long jump: crouch + jump while running fast
    const currentSpeed = Math.sqrt(this.momentum.x ** 2 + this.momentum.z ** 2);
    if (wantsToJump && isCrouching && (this.isGrounded || canCoyoteJump) &&
        currentSpeed > this.LONG_JUMP_SPEED_THRESHOLD && this.jumpCount === 0) {
      this.performLongJump();
      this.jumpBufferTime = 0;
      return;
    }

    // Wall jump: jump while wall sliding
    if (wantsToJump && this.isWallSliding) {
      this.performWallJump();
      this.jumpBufferTime = 0;
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
   * Perform a long jump (horizontal boost + lower vertical)
   */
  private performLongJump(): void {
    // Get movement direction from current momentum
    const speed = Math.sqrt(this.momentum.x ** 2 + this.momentum.z ** 2);
    if (speed > 0) {
      const dirX = this.momentum.x / speed;
      const dirZ = this.momentum.z / speed;

      // Boost horizontal momentum
      const boost = this.LONG_JUMP_HORIZONTAL_BOOST * this.speedMultiplier;
      this.momentum.x += dirX * boost;
      this.momentum.z += dirZ * boost;
    }

    // Apply lower vertical jump (reuse cached velocity)
    this.velocityCache!.x = this.momentum.x;
    this.velocityCache!.y = this.LONG_JUMP_VERTICAL * this.jumpMultiplier;
    this.velocityCache!.z = this.momentum.z;
    this.playerBody.setLinvel(this.velocityCache!, true);

    this.isLongJumping = true;
    this.jumpCount++;
    this.callbacks.onLongJump?.();
  }

  /**
   * Perform a wall jump (kick off wall)
   */
  private performWallJump(): void {
    // Jump away from wall using stored wall normal
    const horizontalBoost = this.WALL_JUMP_HORIZONTAL * this.speedMultiplier;
    this.momentum.x = this.wallSlideNormal.x * horizontalBoost;
    this.momentum.z = this.wallSlideNormal.z * horizontalBoost;

    // Apply vertical jump
    this.velocityCache!.x = this.momentum.x;
    this.velocityCache!.y = this.WALL_JUMP_VERTICAL * this.jumpMultiplier;
    this.velocityCache!.z = this.momentum.z;
    this.playerBody.setLinvel(this.velocityCache!, true);

    // Get position for particle spawn (at wall contact point)
    const pos = this.playerBody.translation();
    this.callbackPosCache.set(
      pos.x - this.wallSlideNormal.x * 0.5,  // Offset toward wall
      pos.y,
      pos.z - this.wallSlideNormal.z * 0.5
    );

    // End wall slide state
    this.isWallSliding = false;

    // Reset jump count (allows double jump after wall jump)
    this.jumpCount = 1;

    this.callbacks.onWallJump?.(this.callbackPosCache, this.wallSlideNormal);
  }

  /**
   * Start ground pound (enters windup phase first for anticipation)
   */
  private startGroundPound(): void {
    this.isGroundPounding = true;
    this.groundPoundWindupTimer = this.GROUND_POUND_WINDUP_DURATION;

    // Kill horizontal momentum
    this.momentum.set(0, 0, 0);

    // Freeze velocity during windup (hover at apex)
    this.velocityCache!.x = 0;
    this.velocityCache!.y = 0;
    this.velocityCache!.z = 0;
    this.playerBody.setLinvel(this.velocityCache!, true);

    // Trigger ground pound animation (highest priority)
    this.animationManager?.setState('groundPound');

    this.callbacks.onGroundPound?.();
  }

  /**
   * Execute ground pound dive (after windup completes)
   */
  private executeGroundPoundDive(): void {
    // Apply strong downward force (reuse cached velocity)
    this.velocityCache!.x = 0;
    this.velocityCache!.y = this.GROUND_POUND_FORCE;
    this.velocityCache!.z = 0;
    this.playerBody.setLinvel(this.velocityCache!, true);
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
   * Check for wall contact using horizontal raycasts
   * Returns wall normal if touching a wall, null otherwise
   */
  private checkWallContact(): THREE.Vector3 | null {
    const pos = this.playerBody.translation();

    // Check 4 cardinal directions for wall contact
    const directions = [
      { x: 1, z: 0 },   // Right
      { x: -1, z: 0 },  // Left
      { x: 0, z: 1 },   // Forward
      { x: 0, z: -1 },  // Back
    ];

    for (const dir of directions) {
      this.wallCheckRay!.origin.x = pos.x;
      this.wallCheckRay!.origin.y = pos.y;
      this.wallCheckRay!.origin.z = pos.z;
      this.wallCheckDir!.x = dir.x;
      this.wallCheckDir!.z = dir.z;
      this.wallCheckRay!.dir = this.wallCheckDir!;

      const hit = this.world.castRay(this.wallCheckRay!, this.WALL_CHECK_DISTANCE, true);
      if (hit !== null) {
        // Return the opposite of the raycast direction as the wall normal
        // (the normal points away from the wall)
        this.wallNormalCache.set(-dir.x, 0, -dir.z);
        return this.wallNormalCache;
      }
    }

    return null;
  }

  /**
   * Get current horizontal speed
   */
  getSpeed(): number {
    return Math.sqrt(this.momentum.x ** 2 + this.momentum.z ** 2);
  }

  /**
   * Get current momentum for external use
   */
  getMomentum(): THREE.Vector3 {
    return this.momentum.clone();
  }

  /**
   * Check if currently ground pounding
   */
  getIsGroundPounding(): boolean {
    return this.isGroundPounding;
  }

  /**
   * Check if currently long jumping
   */
  getIsLongJumping(): boolean {
    return this.isLongJumping;
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
   * Check if wall sliding
   */
  getIsWallSliding(): boolean {
    return this.isWallSliding;
  }

  /**
   * Check if ledge grabbing
   */
  getIsLedgeGrabbing(): boolean {
    return this.isLedgeGrabbing;
  }

  /**
   * Reset state (for respawning)
   */
  reset(): void {
    this.momentum.set(0, 0, 0);
    this.jumpCount = 0;
    this.isGroundPounding = false;
    this.isLongJumping = false;
    this.isWallSliding = false;
    this.isLedgeGrabbing = false;
    this.groundPoundLockout = 0;
    this.landingLockout = 0;
    this.wallSlideTimer = 0;
    this.animationManager?.setState('idle');
  }

  /**
   * Update animation state based on current movement
   */
  private updateAnimationState(): void {
    if (!this.animationManager) return;

    // Ground pound has highest priority
    if (this.isGroundPounding) {
      this.animationManager.setState('groundPound');
      return;
    }

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
