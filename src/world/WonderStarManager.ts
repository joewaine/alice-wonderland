/**
 * WonderStarManager - Manages Wonder Star challenges in the game
 *
 * Each Wonder Star requires completing a specific challenge:
 * - Exploration: Reach a specific location
 * - Race: Beat a time target
 * - Puzzle: Break platforms or activate switches
 * - Collection: Collect items
 * - Skill: Perform specific moves
 */

import * as THREE from 'three';
import type { WonderStar as WonderStarData } from '../data/LevelData';
import { createCelShaderMaterial } from '../shaders/CelShaderMaterial';

export interface WonderStarObject {
  data: WonderStarData;
  mesh: THREE.Group;
  collected: boolean;
  active: boolean;  // Is this the currently selected challenge?
}

export interface ChallengeProgress {
  // Track progress for different challenge types
  reachedPosition: boolean;
  raceTime: number;
  platformsBroken: number;
  starsCollected: number;
  cardsCollected: number;
  groundPoundsPerformed: number;
  longJumpsPerformed: number;
}

export class WonderStarManager {
  private stars: WonderStarObject[] = [];
  private scene: THREE.Scene;
  private progress: ChallengeProgress = this.resetProgress();
  private activeStarId: string | null = null;
  private raceStartTime: number = 0;

  // Callbacks
  public onStarCollected: ((star: WonderStarData, totalCollected: number, totalStars: number) => void) | null = null;
  public onChallengeComplete: ((star: WonderStarData) => void) | null = null;

  // Persistent storage key
  private storageKey: string = 'wonderland_collected_stars';

  // Pre-allocated to avoid per-frame GC pressure
  private reachTargetCache: THREE.Vector3 = new THREE.Vector3();
  private reachTargetRadius: number = 3;
  private hasReachTarget: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Set stars for the current level
   */
  setStars(starData: WonderStarData[]): void {
    // Clear existing stars
    this.cleanup();

    const collectedIds = this.getCollectedStarIds();

    for (const data of starData) {
      const mesh = this.createStarMesh(data);
      const position = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const collected = collectedIds.includes(data.id);

      this.stars.push({
        data,
        mesh,
        collected,
        active: false
      });

      // Dim collected stars
      if (collected) {
        this.setStarCollectedAppearance(mesh);
      }
    }

    console.log(`Loaded ${this.stars.length} Wonder Stars (${collectedIds.length} already collected)`);
  }

  /**
   * Set the active star challenge
   */
  setActiveStar(starId: string | null): void {
    this.activeStarId = starId;
    this.progress = this.resetProgress();
    this.hasReachTarget = false;

    // Setup challenge-specific state
    if (starId) {
      const star = this.stars.find(s => s.data.id === starId);
      if (star) {
        // Reset race timer if this is a race challenge
        if (star.data.challenge_type === 'race') {
          this.raceStartTime = performance.now();
        }

        // Cache reach target for exploration challenges (avoid per-frame allocation)
        if (star.data.challenge_type === 'exploration' && star.data.requirements.reach_position) {
          const pos = star.data.requirements.reach_position;
          this.reachTargetCache.set(pos.x, pos.y, pos.z);
          this.reachTargetRadius = star.data.requirements.reach_radius || 3;
          this.hasReachTarget = true;
        }
      }
    }

    // Update visual appearance
    for (const star of this.stars) {
      if (star.collected) continue;

      if (star.data.id === starId) {
        star.active = true;
        this.setStarActiveAppearance(star.mesh);
      } else {
        star.active = false;
        this.setStarInactiveAppearance(star.mesh);
      }
    }

    console.log(`Active star: ${starId || 'none'}`);
  }

  /**
   * Get spawn point for active star (if specified)
   */
  getActiveStarSpawn(): THREE.Vector3 | null {
    if (!this.activeStarId) return null;

    const star = this.stars.find(s => s.data.id === this.activeStarId);
    if (star?.data.spawn_near) {
      return new THREE.Vector3(
        star.data.spawn_near.x,
        star.data.spawn_near.y,
        star.data.spawn_near.z
      );
    }
    return null;
  }

  /**
   * Update star animations and check for collection
   */
  update(dt: number, playerPos: THREE.Vector3, playerRadius: number): void {
    // Update race timer
    if (this.activeStarId) {
      const star = this.stars.find(s => s.data.id === this.activeStarId);
      if (star && star.data.challenge_type === 'race') {
        this.progress.raceTime = (performance.now() - this.raceStartTime) / 1000;
      }
    }

    for (const star of this.stars) {
      // Animate star mesh
      star.mesh.rotation.y += dt * 1.5;
      star.mesh.position.y = star.data.position.y + Math.sin(Date.now() * 0.002) * 0.2;

      // Skip collected stars
      if (star.collected) continue;

      // Check distance to player
      const distance = star.mesh.position.distanceTo(playerPos);
      const pickupRadius = 1.5 + playerRadius;

      // Scale up when close
      if (distance < 4) {
        const scale = 1 + (1 - distance / 4) * 0.3;
        star.mesh.scale.setScalar(scale);
      } else {
        star.mesh.scale.setScalar(1);
      }

      // Check if challenge is complete and player reaches star
      if (distance < pickupRadius && this.isChallengeComplete(star)) {
        this.collectStar(star);
      }
    }
  }

  /**
   * Check if the current challenge requirements are met
   */
  private isChallengeComplete(star: WonderStarObject): boolean {
    const req = star.data.requirements;

    switch (star.data.challenge_type) {
      case 'exploration':
        return this.progress.reachedPosition;

      case 'race':
        if (req.beat_time && this.progress.raceTime > 0) {
          return this.progress.raceTime <= req.beat_time;
        }
        return false;

      case 'puzzle':
        if (req.break_platforms) {
          return this.progress.platformsBroken >= req.break_platforms;
        }
        return true;

      case 'collection':
        if (req.collect_stars && this.progress.starsCollected < req.collect_stars) {
          return false;
        }
        if (req.collect_cards && this.progress.cardsCollected < req.collect_cards) {
          return false;
        }
        return true;

      case 'skill':
        if (req.perform_ground_pounds && this.progress.groundPoundsPerformed < req.perform_ground_pounds) {
          return false;
        }
        if (req.perform_long_jumps && this.progress.longJumpsPerformed < req.perform_long_jumps) {
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  /**
   * Collect a star
   */
  private collectStar(star: WonderStarObject): void {
    if (star.collected) return;

    star.collected = true;
    this.setStarCollectedAppearance(star.mesh);

    // Save to persistent storage
    this.saveCollectedStar(star.data.id);

    const totalCollected = this.stars.filter(s => s.collected).length;
    console.log(`Collected Wonder Star: ${star.data.name} (${totalCollected}/${this.stars.length})`);

    // Callbacks
    this.onStarCollected?.(star.data, totalCollected, this.stars.length);
    this.onChallengeComplete?.(star.data);

    // Clear active star
    if (this.activeStarId === star.data.id) {
      this.activeStarId = null;
    }
  }

  // ===== Progress Tracking Methods =====

  /**
   * Track when player reaches a specific position (for exploration challenges)
   */
  trackReachPosition(position: THREE.Vector3): void {
    // Use cached reach target to avoid per-frame Vector3 allocation
    if (!this.hasReachTarget || this.progress.reachedPosition) return;

    if (position.distanceTo(this.reachTargetCache) <= this.reachTargetRadius) {
      this.progress.reachedPosition = true;
      const star = this.stars.find(s => s.data.id === this.activeStarId);
      if (star) {
        console.log(`Reached target position for ${star.data.name}!`);
      }
    }
  }

  /**
   * Track platform breaks
   */
  trackPlatformBreak(): void {
    this.progress.platformsBroken++;
  }

  /**
   * Track collectible pickups
   */
  trackCollectible(type: 'star' | 'card' | 'key'): void {
    if (type === 'star') {
      this.progress.starsCollected++;
    } else if (type === 'card') {
      this.progress.cardsCollected++;
    }
  }

  /**
   * Track ground pound
   */
  trackGroundPound(): void {
    this.progress.groundPoundsPerformed++;
  }

  /**
   * Track long jump
   */
  trackLongJump(): void {
    this.progress.longJumpsPerformed++;
  }

  // ===== Visual Methods =====

  /**
   * Create the star mesh (larger than regular stars)
   */
  private createStarMesh(data: WonderStarData): THREE.Group {
    const group = new THREE.Group();

    // Main star shape
    const geometry = new THREE.OctahedronGeometry(0.8);
    const material = createCelShaderMaterial({
      color: 0xFFD700,
      shadowColor: 0xCC9900,
      highlightColor: 0xFFFF88,
      rimColor: 0xFFE55C,
      rimPower: 2.0
    });
    const star = new THREE.Mesh(geometry, material);
    group.add(star);

    // Outer glow
    const glowGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // Challenge type indicator (colored ring)
    const ringColor = this.getChallengeTypeColor(data.challenge_type);
    const ringGeo = new THREE.TorusGeometry(1.0, 0.1, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    group.userData.wonderStar = true;
    group.userData.starId = data.id;

    return group;
  }

  /**
   * Get color for challenge type
   */
  private getChallengeTypeColor(type: string): number {
    switch (type) {
      case 'exploration': return 0x00ff00;  // Green
      case 'race': return 0xff0000;         // Red
      case 'puzzle': return 0x0088ff;       // Blue
      case 'collection': return 0xff00ff;   // Magenta
      case 'skill': return 0xffaa00;        // Orange
      default: return 0xffffff;
    }
  }

  /**
   * Set star appearance when active
   */
  private setStarActiveAppearance(mesh: THREE.Group): void {
    mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.ShaderMaterial && child.material.uniforms.uHighlightColor) {
          // Brighten the highlight for active stars
          child.material.uniforms.uHighlightColor.value.set(0xFFFFAA);
        }
      }
    });
  }

  /**
   * Set star appearance when inactive
   */
  private setStarInactiveAppearance(mesh: THREE.Group): void {
    mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.ShaderMaterial && child.material.uniforms.uHighlightColor) {
          // Dim the highlight for inactive stars
          child.material.uniforms.uHighlightColor.value.set(0xFFFF88);
        }
      }
    });
  }

  /**
   * Set star appearance when collected
   */
  private setStarCollectedAppearance(mesh: THREE.Group): void {
    mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.ShaderMaterial && child.material.uniforms.uColor) {
          // Gray out the cel-shaded star
          child.material.uniforms.uColor.value.set(0x888888);
          child.material.uniforms.uShadowColor.value.set(0x555555);
          child.material.uniforms.uHighlightColor.value.set(0xAAAAAA);
          child.material.uniforms.uRimColor.value.set(0x777777);
        } else if (child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = 0.1;
        }
      }
    });
  }

  // ===== Persistence Methods =====

  /**
   * Get list of collected star IDs from localStorage
   */
  private getCollectedStarIds(): string[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save collected star to localStorage
   */
  private saveCollectedStar(starId: string): void {
    try {
      const collected = this.getCollectedStarIds();
      if (!collected.includes(starId)) {
        collected.push(starId);
        localStorage.setItem(this.storageKey, JSON.stringify(collected));
      }
    } catch (e) {
      console.warn('Failed to save star collection:', e);
    }
  }

  /**
   * Reset all collected stars (for testing)
   */
  resetAllProgress(): void {
    try {
      localStorage.removeItem(this.storageKey);
      for (const star of this.stars) {
        star.collected = false;
        this.setStarInactiveAppearance(star.mesh);
      }
      console.log('Reset all Wonder Star progress');
    } catch {
      // Ignore
    }
  }

  // ===== Utility Methods =====

  /**
   * Get all stars in current level
   */
  getStars(): WonderStarObject[] {
    return this.stars;
  }

  /**
   * Get active star data
   */
  getActiveStar(): WonderStarData | null {
    if (!this.activeStarId) return null;
    const star = this.stars.find(s => s.data.id === this.activeStarId);
    return star?.data || null;
  }

  /**
   * Get current progress for active challenge
   */
  getProgress(): ChallengeProgress {
    return { ...this.progress };
  }

  /**
   * Get collection stats
   */
  getStats(): { collected: number; total: number } {
    return {
      collected: this.stars.filter(s => s.collected).length,
      total: this.stars.length
    };
  }

  /**
   * Reset progress tracker
   */
  private resetProgress(): ChallengeProgress {
    return {
      reachedPosition: false,
      raceTime: 0,
      platformsBroken: 0,
      starsCollected: 0,
      cardsCollected: 0,
      groundPoundsPerformed: 0,
      longJumpsPerformed: 0
    };
  }

  /**
   * Cleanup stars
   */
  cleanup(): void {
    for (const star of this.stars) {
      this.scene.remove(star.mesh);
      star.mesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.stars = [];
    this.activeStarId = null;
    this.progress = this.resetProgress();
  }
}
