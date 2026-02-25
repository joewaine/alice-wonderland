/**
 * HUD - Heads-Up Display for game UI
 *
 * Shows collectible counts, chapter info, and messages.
 */

import type { CollectionState } from '../world/Collectible';

export class HUD {
  private container: HTMLDivElement;
  private chapterTitle: HTMLDivElement;
  private collectiblesDisplay: HTMLDivElement;
  private messageDisplay: HTMLDivElement;
  private messageTimeout: number | null = null;

  constructor() {
    // Main container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      pointer-events: none;
      font-family: monospace;
      z-index: 100;
    `;

    // Chapter title (top center)
    this.chapterTitle = document.createElement('div');
    this.chapterTitle.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      text-align: center;
      opacity: 0;
      transition: opacity 0.5s;
    `;
    this.container.appendChild(this.chapterTitle);

    // Collectibles display (top right)
    this.collectiblesDisplay = document.createElement('div');
    this.collectiblesDisplay.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      color: white;
      font-size: 16px;
      background: rgba(0,0,0,0.7);
      padding: 15px;
      border-radius: 8px;
      text-align: right;
    `;
    this.container.appendChild(this.collectiblesDisplay);

    // Message display (center)
    this.messageDisplay = document.createElement('div');
    this.messageDisplay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 28px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    this.container.appendChild(this.messageDisplay);

    document.body.appendChild(this.container);

    // Initialize display
    this.updateCollectibles({
      hasKey: false,
      stars: 0,
      cards: 0,
      totalStars: 0,
      totalCards: 0
    });
  }

  /**
   * Show chapter title with fade
   */
  showChapterTitle(title: string, subtitle?: string): void {
    this.chapterTitle.innerHTML = `
      <div>${title}</div>
      ${subtitle ? `<div style="font-size: 16px; margin-top: 5px; font-weight: normal">${subtitle}</div>` : ''}
    `;
    this.chapterTitle.style.opacity = '1';

    // Fade out after 3 seconds
    setTimeout(() => {
      this.chapterTitle.style.opacity = '0';
    }, 3000);
  }

  /**
   * Update collectibles display
   */
  updateCollectibles(state: CollectionState): void {
    const keyIcon = state.hasKey ? '🔑' : '🔒';
    const keyColor = state.hasKey ? '#ffd700' : '#666';

    this.collectiblesDisplay.innerHTML = `
      <div style="margin-bottom: 8px;">
        <span style="color: ${keyColor}">${keyIcon} Key</span>
      </div>
      <div style="margin-bottom: 8px; color: #ffff00">
        ⭐ ${state.stars} / ${state.totalStars}
      </div>
      <div style="color: #ff6b6b">
        🃏 ${state.cards} / ${state.totalCards}
      </div>
    `;
  }

  /**
   * Show a temporary message
   */
  showMessage(text: string, duration: number = 2000): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    this.messageDisplay.textContent = text;
    this.messageDisplay.style.opacity = '1';

    this.messageTimeout = window.setTimeout(() => {
      this.messageDisplay.style.opacity = '0';
      this.messageTimeout = null;
    }, duration);
  }

  /**
   * Show hint message (smaller, longer duration)
   */
  showHint(text: string): void {
    this.messageDisplay.style.fontSize = '18px';
    this.showMessage(text, 4000);
    setTimeout(() => {
      this.messageDisplay.style.fontSize = '28px';
    }, 4100);
  }

  /**
   * Clean up
   */
  dispose(): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    document.body.removeChild(this.container);
  }
}
