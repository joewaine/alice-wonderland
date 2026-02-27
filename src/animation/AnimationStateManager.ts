/**
 * AnimationStateManager - Skeletal animation state machine
 *
 * Manages animation transitions with crossfading for smooth blends.
 * Designed for player character but reusable for NPCs.
 */

import * as THREE from 'three';

export type AnimationState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land';

// Priority determines which animations can interrupt others
// Higher priority = can interrupt lower priority states
const STATE_PRIORITY: Record<AnimationState, number> = {
  idle: 0,
  walk: 1,
  run: 2,
  fall: 3,
  jump: 4,
  land: 5,
};

// States that auto-transition to another state when complete
const AUTO_TRANSITIONS: Partial<Record<AnimationState, AnimationState>> = {
  land: 'idle',
  jump: 'fall',
};

// Default crossfade durations (can be overridden per-call)
const DEFAULT_CROSSFADE: Partial<Record<AnimationState, number>> = {
  idle: 0.3,
  walk: 0.2,
  run: 0.15,
  jump: 0.1,
  fall: 0.2,
  land: 0.1,
};

export interface AnimationStateManagerOptions {
  defaultCrossfade?: number;
  speedScale?: number;
}

export class AnimationStateManager {
  private mixer: THREE.AnimationMixer;
  private animations: Map<AnimationState, THREE.AnimationAction> = new Map();
  private currentState: AnimationState = 'idle';
  private speedScale: number = 1.0;
  private defaultCrossfade: number;
  private isTransitioning: boolean = false;

  // Callback when animation completes (for auto-transitions)
  private onAnimationComplete: ((state: AnimationState) => void) | null = null;

  // Stored handler ref for cleanup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleFinished = (e: any) => {
    const action = e.action as THREE.AnimationAction;
    const state = this.findStateForAction(action);

    if (state && state === this.currentState) {
      const nextState = AUTO_TRANSITIONS[state];
      if (nextState && this.animations.has(nextState)) {
        this.setState(nextState);
      }

      if (this.onAnimationComplete) {
        this.onAnimationComplete(state);
      }
    }
  };

  constructor(mixer: THREE.AnimationMixer, options: AnimationStateManagerOptions = {}) {
    this.mixer = mixer;
    this.defaultCrossfade = options.defaultCrossfade ?? 0.2;
    this.speedScale = options.speedScale ?? 1.0;

    // Listen for animation completion
    this.mixer.addEventListener('finished', this.handleFinished);
  }

  /**
   * Register an animation clip for a state
   */
  registerAnimation(state: AnimationState, clip: THREE.AnimationClip, options?: {
    loop?: THREE.AnimationActionLoopStyles;
    clampWhenFinished?: boolean;
  }): void {
    const action = this.mixer.clipAction(clip);

    // Configure looping
    if (options?.loop !== undefined) {
      action.loop = options.loop;
    } else {
      // Default: loop idle/walk/run/fall, play once for jump/land/groundPound
      const loopingStates: AnimationState[] = ['idle', 'walk', 'run', 'fall'];
      action.loop = loopingStates.includes(state) ? THREE.LoopRepeat : THREE.LoopOnce;
    }

    // Clamp on finish (stay at last frame)
    action.clampWhenFinished = options?.clampWhenFinished ?? true;

    this.animations.set(state, action);

    // If this is idle and no current animation, start it
    if (state === 'idle' && this.currentState === 'idle' && !this.isTransitioning) {
      action.play();
    }
  }

  /**
   * Register multiple animations from a GLTF's animation array
   * Expects naming convention: "idle", "walk", "run", etc.
   */
  registerAnimationsFromGLTF(animations: THREE.AnimationClip[]): void {
    for (const clip of animations) {
      const stateName = clip.name.toLowerCase() as AnimationState;
      if (STATE_PRIORITY[stateName] !== undefined) {
        this.registerAnimation(stateName, clip);
        console.log(`Registered animation: ${stateName} (${clip.duration.toFixed(2)}s)`);
      }
    }
  }

  /**
   * Transition to a new animation state
   */
  setState(newState: AnimationState, crossfadeDuration?: number): boolean {
    // Don't transition to same state
    if (newState === this.currentState) {
      return false;
    }

    // Check if we have this animation
    const newAction = this.animations.get(newState);
    if (!newAction) {
      // Silently skip if animation not registered
      return false;
    }

    // Check priority - can only interrupt if same or higher priority
    const currentPriority = STATE_PRIORITY[this.currentState];
    const newPriority = STATE_PRIORITY[newState];

    if (newPriority < currentPriority && this.isTransitioning) {
      // Can't interrupt higher priority animation while transitioning
      return false;
    }

    // Get current action
    const currentAction = this.animations.get(this.currentState);

    // Determine crossfade duration
    const duration = crossfadeDuration ?? DEFAULT_CROSSFADE[newState] ?? this.defaultCrossfade;

    // Perform crossfade
    this.isTransitioning = true;
    this.currentState = newState;

    // Reset and play new animation
    newAction.reset();
    newAction.setEffectiveTimeScale(this.speedScale);
    newAction.setEffectiveWeight(1);
    newAction.play();

    // Crossfade from current
    if (currentAction) {
      newAction.crossFadeFrom(currentAction, duration, true);
    }

    // Mark transition complete after duration
    setTimeout(() => {
      this.isTransitioning = false;
    }, duration * 1000);

    return true;
  }

  /**
   * Update the animation mixer
   */
  update(dt: number): void {
    this.mixer.update(dt);
  }

  /**
   * Set animation playback speed (affects all animations)
   */
  setSpeedScale(scale: number): void {
    this.speedScale = scale;

    // Update current action's speed
    const currentAction = this.animations.get(this.currentState);
    if (currentAction) {
      currentAction.setEffectiveTimeScale(scale);
    }
  }

  /**
   * Get current animation state
   */
  getCurrentState(): AnimationState {
    return this.currentState;
  }

  /**
   * Set callback for when animations complete
   */
  setOnAnimationComplete(callback: (state: AnimationState) => void): void {
    this.onAnimationComplete = callback;
  }

  /**
   * Stop all animations
   */
  private stopAll(): void {
    this.mixer.stopAllAction();
  }

  /**
   * Find which state an action belongs to
   */
  private findStateForAction(action: THREE.AnimationAction): AnimationState | null {
    for (const [state, registeredAction] of this.animations) {
      if (registeredAction === action) {
        return state;
      }
    }
    return null;
  }

  /**
   * Dispose of the animation manager
   */
  dispose(): void {
    this.mixer.removeEventListener('finished', this.handleFinished);
    this.stopAll();
    this.animations.clear();
  }
}
