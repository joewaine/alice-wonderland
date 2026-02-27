/**
 * StarSelect - UI overlay for selecting Wonder Star challenges
 *
 * Shows available stars for the current chapter:
 * - Collected stars shown as gold
 * - Uncollected shown as outline
 * - Selecting a star spawns you near its challenge
 */

import type { WonderStar } from '../data/LevelData';

export interface StarSelectCallbacks {
  onStarSelected: (starId: string) => void;
  onClose: () => void;
}

export class StarSelect {
  private container: HTMLDivElement | null = null;
  private stars: WonderStar[] = [];
  private collectedIds: Set<string> = new Set();
  private callbacks: StarSelectCallbacks | null = null;
  private isVisible: boolean = false;

  /**
   * Show the star select overlay
   */
  show(stars: WonderStar[], collectedIds: string[], callbacks: StarSelectCallbacks): void {
    this.stars = stars;
    this.collectedIds = new Set(collectedIds);
    this.callbacks = callbacks;
    this.isVisible = true;

    this.createUI();
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    this.isVisible = false;
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }
  }

  /**
   * Check if visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Create the UI elements
   */
  private createUI(): void {
    // Remove existing container if any
    if (this.container) {
      document.body.removeChild(this.container);
    }

    // Create container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      font-family: 'Georgia', serif;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Select a Wonder Star';
    title.style.cssText = `
      color: #ffd700;
      font-size: 36px;
      margin-bottom: 10px;
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    `;
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    const collected = this.collectedIds.size;
    const total = this.stars.length;
    subtitle.textContent = `${collected} of ${total} stars collected`;
    subtitle.style.cssText = `
      color: #aaa;
      font-size: 18px;
      margin-bottom: 30px;
    `;
    this.container.appendChild(subtitle);

    // Star grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      max-width: 1200px;
      width: 90%;
      max-height: 60vh;
      overflow-y: auto;
      padding: 20px;
    `;

    for (const star of this.stars) {
      const card = this.createStarCard(star);
      grid.appendChild(card);
    }

    this.container.appendChild(grid);

    // Close button / instructions
    const closeHint = document.createElement('p');
    closeHint.textContent = 'Press ESC or click outside to start without a challenge';
    closeHint.style.cssText = `
      color: #666;
      font-size: 14px;
      margin-top: 30px;
    `;
    this.container.appendChild(closeHint);

    // Close on ESC or background click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.handleClose();
      }
    });

    document.addEventListener('keydown', this.handleKeyDown);

    document.body.appendChild(this.container);
  }

  /**
   * Create a star card element
   */
  private createStarCard(star: WonderStar): HTMLDivElement {
    const isCollected = this.collectedIds.has(star.id);

    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isCollected ? 'linear-gradient(135deg, #3d3d1d, #2d2d15)' : 'linear-gradient(135deg, #1a1a2e, #16213e)'};
      border: 2px solid ${isCollected ? '#ffd700' : this.getChallengeTypeColor(star.challenge_type)};
      border-radius: 12px;
      padding: 20px;
      cursor: ${isCollected ? 'default' : 'pointer'};
      transition: transform 0.2s, box-shadow 0.2s;
      opacity: ${isCollected ? '0.6' : '1'};
    `;

    if (!isCollected) {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'scale(1.05)';
        card.style.boxShadow = `0 0 20px ${this.getChallengeTypeColor(star.challenge_type)}`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'scale(1)';
        card.style.boxShadow = 'none';
      });

      card.addEventListener('click', () => {
        this.handleStarSelect(star.id);
      });
    }

    // Star icon
    const icon = document.createElement('div');
    icon.innerHTML = isCollected ? '&#9733;' : '&#9734;';
    icon.style.cssText = `
      font-size: 48px;
      color: ${isCollected ? '#ffd700' : this.getChallengeTypeColor(star.challenge_type)};
      text-align: center;
      text-shadow: 0 0 10px ${isCollected ? '#ffd700' : this.getChallengeTypeColor(star.challenge_type)};
    `;
    card.appendChild(icon);

    // Star name
    const name = document.createElement('h3');
    name.textContent = star.name;
    name.style.cssText = `
      color: ${isCollected ? '#ccc' : '#fff'};
      font-size: 20px;
      margin: 10px 0 5px 0;
      text-align: center;
    `;
    card.appendChild(name);

    // Challenge type badge
    const badge = document.createElement('span');
    badge.textContent = star.challenge_type.toUpperCase();
    badge.style.cssText = `
      display: inline-block;
      background: ${this.getChallengeTypeColor(star.challenge_type)};
      color: #000;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 10px;
    `;
    const badgeContainer = document.createElement('div');
    badgeContainer.style.textAlign = 'center';
    badgeContainer.appendChild(badge);
    card.appendChild(badgeContainer);

    // Hint
    const hint = document.createElement('p');
    hint.textContent = isCollected ? 'Collected!' : star.hint;
    hint.style.cssText = `
      color: #888;
      font-size: 14px;
      text-align: center;
      margin: 0;
      font-style: italic;
    `;
    card.appendChild(hint);

    // Requirements (if not collected)
    if (!isCollected && star.requirements) {
      const reqText = this.formatRequirements(star);
      if (reqText) {
        const req = document.createElement('p');
        req.textContent = reqText;
        req.style.cssText = `
          color: ${this.getChallengeTypeColor(star.challenge_type)};
          font-size: 12px;
          text-align: center;
          margin-top: 8px;
        `;
        card.appendChild(req);
      }
    }

    return card;
  }

  /**
   * Format requirements as readable text
   */
  private formatRequirements(star: WonderStar): string {
    const req = star.requirements;
    const parts: string[] = [];

    if (req.beat_time) {
      parts.push(`Beat time: ${req.beat_time}s`);
    }
    if (req.break_platforms) {
      parts.push(`Break ${req.break_platforms} platform${req.break_platforms > 1 ? 's' : ''}`);
    }
    if (req.collect_stars) {
      parts.push(`Collect ${req.collect_stars} star${req.collect_stars > 1 ? 's' : ''}`);
    }
    if (req.collect_cards) {
      parts.push(`Collect ${req.collect_cards} card${req.collect_cards > 1 ? 's' : ''}`);
    }
    if (req.perform_ground_pounds) {
      parts.push(`Perform ${req.perform_ground_pounds} ground pound${req.perform_ground_pounds > 1 ? 's' : ''}`);
    }
    if (req.perform_long_jumps) {
      parts.push(`Perform ${req.perform_long_jumps} long jump${req.perform_long_jumps > 1 ? 's' : ''}`);
    }

    return parts.join(' | ');
  }

  /**
   * Get color for challenge type
   */
  private getChallengeTypeColor(type: string): string {
    switch (type) {
      case 'exploration': return '#00ff00';
      case 'race': return '#ff4444';
      case 'puzzle': return '#4488ff';
      case 'collection': return '#ff44ff';
      case 'skill': return '#ffaa00';
      default: return '#ffffff';
    }
  }

  /**
   * Handle star selection
   */
  private handleStarSelect(starId: string): void {
    this.hide();
    this.callbacks?.onStarSelected(starId);
  }

  /**
   * Handle close
   */
  private handleClose(): void {
    this.hide();
    this.callbacks?.onClose();
  }

  /**
   * Handle keyboard input
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.handleClose();
    }
  };
}
