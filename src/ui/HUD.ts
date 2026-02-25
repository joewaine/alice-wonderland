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
  private muteIndicator: HTMLDivElement;
  private sizeIndicator: HTMLDivElement;
  private fadeOverlay: HTMLDivElement;
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

    // Mute indicator (top left)
    this.muteIndicator = document.createElement('div');
    this.muteIndicator.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      color: white;
      font-size: 24px;
      background: rgba(0,0,0,0.7);
      padding: 8px 12px;
      border-radius: 8px;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    this.muteIndicator.textContent = '🔇 Muted (M)';
    this.container.appendChild(this.muteIndicator);

    // Size indicator (bottom right, above instructions)
    this.sizeIndicator = document.createElement('div');
    this.sizeIndicator.style.cssText = `
      position: absolute;
      bottom: 140px;
      right: 20px;
      color: white;
      font-size: 18px;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 8px;
      text-align: center;
      transition: all 0.3s ease;
    `;
    this.sizeIndicator.innerHTML = '👤 Normal';
    this.container.appendChild(this.sizeIndicator);

    // Fade overlay for death/respawn transitions
    this.fadeOverlay = document.createElement('div');
    this.fadeOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: black;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.5s ease-in-out;
      z-index: 1000;
    `;
    this.container.appendChild(this.fadeOverlay);

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
   * Update mute indicator
   */
  setMuted(muted: boolean): void {
    this.muteIndicator.style.opacity = muted ? '1' : '0';
  }

  /**
   * Update size indicator
   */
  updateSize(size: 'small' | 'normal' | 'large'): void {
    const sizeInfo = {
      small: { icon: '🐁', label: 'Small', color: '#ff69b4' },
      normal: { icon: '👤', label: 'Normal', color: '#ffffff' },
      large: { icon: '🦣', label: 'Large', color: '#9370db' }
    };

    const info = sizeInfo[size];
    this.sizeIndicator.innerHTML = `${info.icon} ${info.label}`;
    this.sizeIndicator.style.color = info.color;
    this.sizeIndicator.style.borderColor = info.color;

    // Flash effect on change
    this.sizeIndicator.style.transform = 'scale(1.2)';
    setTimeout(() => {
      this.sizeIndicator.style.transform = 'scale(1)';
    }, 200);
  }

  /**
   * Fade screen to black (for death)
   */
  fadeToBlack(): Promise<void> {
    return new Promise((resolve) => {
      this.fadeOverlay.style.opacity = '1';
      setTimeout(resolve, 500); // Match transition duration
    });
  }

  /**
   * Fade screen back in (for respawn)
   */
  fadeIn(): Promise<void> {
    return new Promise((resolve) => {
      this.fadeOverlay.style.opacity = '0';
      setTimeout(resolve, 500); // Match transition duration
    });
  }

  /**
   * Show chapter complete celebration
   */
  showChapterComplete(
    chapterNum: number,
    stats: { stars: number; totalStars: number; cards: number; totalCards: number },
    onComplete: () => void
  ): void {
    // Create celebration overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Georgia', serif;
      z-index: 500;
      opacity: 0;
      transition: opacity 0.5s;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Chapter Complete!';
    title.style.cssText = `
      font-size: 56px;
      color: #ffd700;
      text-shadow: 0 0 30px #ffd700;
      margin: 0 0 20px 0;
      animation: celebrate 0.5s ease-out;
    `;
    overlay.appendChild(title);

    // Chapter name
    const chapterName = document.createElement('p');
    chapterName.textContent = `Chapter ${chapterNum}`;
    chapterName.style.cssText = `
      font-size: 24px;
      color: #e0b0ff;
      margin: 0 0 40px 0;
    `;
    overlay.appendChild(chapterName);

    // Stats
    const statsDiv = document.createElement('div');
    statsDiv.style.cssText = `
      font-size: 24px;
      color: white;
      text-align: center;
      margin-bottom: 40px;
    `;
    statsDiv.innerHTML = `
      <p style="margin: 10px 0; color: #ffff00">⭐ Stars: ${stats.stars} / ${stats.totalStars}</p>
      <p style="margin: 10px 0; color: #ff6b6b">🃏 Cards: ${stats.cards} / ${stats.totalCards}</p>
    `;
    overlay.appendChild(statsDiv);

    // Continue text
    const continueText = document.createElement('p');
    continueText.textContent = 'Entering next chapter...';
    continueText.style.cssText = `
      font-size: 18px;
      color: #888;
      font-style: italic;
    `;
    overlay.appendChild(continueText);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes celebrate {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // Wait then fade out and continue
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(overlay);
        document.head.removeChild(style); // Clean up injected style
        onComplete();
      }, 500);
    }, 3000);
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
