/**
 * AreaIndicator - Shows current area name when entering a new zone
 *
 * Displays area name with fade in/out animation at top center of screen.
 * Triggered when player moves between defined areas.
 */

import * as THREE from 'three';
import type { Area } from '../data/LevelData';

export class AreaIndicator {
  private container: HTMLDivElement;
  private nameElement: HTMLDivElement;
  private subtitleElement: HTMLDivElement;
  private currentAreaId: string | null = null;
  private areas: Area[] = [];
  private hideTimeout: number | null = null;

  constructor() {
    // Create container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      pointer-events: none;
      z-index: 150;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
    `;

    // Area name
    this.nameElement = document.createElement('div');
    this.nameElement.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 28px;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5);
      letter-spacing: 2px;
    `;

    // Subtitle (optional)
    this.subtitleElement = document.createElement('div');
    this.subtitleElement.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 14px;
      font-style: italic;
      color: rgba(255,255,255,0.8);
      text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
      margin-top: 4px;
    `;

    this.container.appendChild(this.nameElement);
    this.container.appendChild(this.subtitleElement);
    document.body.appendChild(this.container);
  }

  /**
   * Set areas for tracking
   */
  setAreas(areas: Area[]): void {
    this.areas = areas;
    this.currentAreaId = null;
  }

  /**
   * Update based on player position
   */
  update(playerPosition: THREE.Vector3): void {
    if (this.areas.length === 0) return;

    // Find which area the player is in
    let currentArea: Area | null = null;
    for (const area of this.areas) {
      const bounds = new THREE.Box3(
        new THREE.Vector3(area.bounds.min.x, area.bounds.min.y, area.bounds.min.z),
        new THREE.Vector3(area.bounds.max.x, area.bounds.max.y, area.bounds.max.z)
      );

      if (bounds.containsPoint(playerPosition)) {
        currentArea = area;
        break;
      }
    }

    // Check if area changed
    const newAreaId = currentArea?.id || null;
    if (newAreaId !== this.currentAreaId) {
      this.currentAreaId = newAreaId;

      if (currentArea) {
        this.show(currentArea.name);
      }
    }
  }

  /**
   * Show area name with animation
   */
  private show(areaName: string, subtitle?: string): void {
    // Clear any pending hide
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
    }

    // Update content
    this.nameElement.textContent = areaName;
    this.subtitleElement.textContent = subtitle || '';
    this.subtitleElement.style.display = subtitle ? 'block' : 'none';

    // Fade in
    this.container.style.opacity = '1';

    // Schedule fade out
    this.hideTimeout = window.setTimeout(() => {
      this.hide();
    }, 2500);
  }

  /**
   * Hide with animation
   */
  private hide(): void {
    this.container.style.opacity = '0';
    this.hideTimeout = null;
  }

  /**
   * Force show an area (for external triggers)
   */
  showArea(areaName: string, subtitle?: string): void {
    this.show(areaName, subtitle);
  }

  /**
   * Get current area ID
   */
  getCurrentAreaId(): string | null {
    return this.currentAreaId;
  }

  /**
   * Clear areas (on level change)
   */
  clear(): void {
    this.areas = [];
    this.currentAreaId = null;
    this.hide();
  }

  /**
   * Dispose
   */
  dispose(): void {
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
    }
    this.container.remove();
  }
}
