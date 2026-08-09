/**
 * HUD - Heads-Up Display for game UI
 *
 * Gilded Storybook treatment: glass panels, serif typography, gold accents.
 * Shows collectible counts, chapter info, and messages.
 */

import type { CollectionState } from '../world/Collectible';
import { injectTheme } from './theme';

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
    injectTheme();

    // Main container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      pointer-events: none;
      font-family: var(--aw-font-text);
      z-index: 100;
    `;

    // Chapter title (top center)
    this.chapterTitle = document.createElement('div');
    this.chapterTitle.style.cssText = `
      position: absolute;
      top: 34px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      opacity: 0;
      transition: opacity 0.8s ease;
      white-space: nowrap;
    `;
    this.container.appendChild(this.chapterTitle);

    // Collectibles display (top right)
    this.collectiblesDisplay = document.createElement('div');
    this.collectiblesDisplay.className = 'aw-panel';
    this.collectiblesDisplay.style.cssText += `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 14px 20px;
      font-size: 18px;
      text-align: right;
      min-width: 110px;
    `;
    this.container.appendChild(this.collectiblesDisplay);

    // Message display (center)
    this.messageDisplay = document.createElement('div');
    this.messageDisplay.className = 'aw-display';
    this.messageDisplay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--aw-parchment);
      font-size: 32px;
      letter-spacing: 0.08em;
      text-shadow: 0 2px 18px rgba(0, 0, 0, 0.75), 0 0 40px rgba(212, 175, 95, 0.25);
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s;
      white-space: nowrap;
    `;
    this.container.appendChild(this.messageDisplay);

    // Mute indicator (top left)
    this.muteIndicator = document.createElement('div');
    this.muteIndicator.className = 'aw-panel';
    this.muteIndicator.style.cssText += `
      position: absolute;
      top: 20px;
      left: 20px;
      font-size: 17px;
      padding: 10px 16px;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    this.muteIndicator.innerHTML = `🔇 Muted <span class="aw-kbd" style="margin-left:6px">M</span>`;
    this.container.appendChild(this.muteIndicator);

    // Size indicator (bottom right)
    this.sizeIndicator = document.createElement('div');
    this.sizeIndicator.className = 'aw-panel';
    this.sizeIndicator.style.cssText += `
      position: absolute;
      bottom: 140px;
      right: 20px;
      font-size: 18px;
      padding: 10px 18px;
      text-align: center;
      letter-spacing: 0.08em;
      transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
    `;
    this.sizeIndicator.textContent = 'Normal';
    this.container.appendChild(this.sizeIndicator);

    // Fade overlay for death/respawn transitions
    this.fadeOverlay = document.createElement('div');
    this.fadeOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--aw-ink-deep);
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
      cards: 0,
      totalCards: 0
    });
  }

  /**
   * Show chapter title with fade
   */
  showChapterTitle(title: string, subtitle?: string): void {
    this.chapterTitle.textContent = '';

    const titleDiv = document.createElement('div');
    titleDiv.textContent = title;
    titleDiv.className = 'aw-display aw-gold-text';
    titleDiv.style.cssText = 'font-size: 44px;';
    this.chapterTitle.appendChild(titleDiv);

    if (subtitle) {
      const ornament = document.createElement('div');
      ornament.className = 'aw-ornament';
      ornament.textContent = '❦';
      ornament.style.cssText = 'width: 240px; margin: 8px auto; font-size: 13px;';
      this.chapterTitle.appendChild(ornament);

      const subtitleDiv = document.createElement('div');
      subtitleDiv.textContent = subtitle;
      subtitleDiv.style.cssText = `
        font-family: var(--aw-font-text);
        font-style: italic;
        font-size: 19px;
        color: var(--aw-parchment);
        opacity: 0.85;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
      `;
      this.chapterTitle.appendChild(subtitleDiv);
    }
    this.chapterTitle.style.opacity = '1';

    // Fade out after 4 seconds
    setTimeout(() => {
      this.chapterTitle.style.opacity = '0';
    }, 4000);
  }

  /**
   * Update collectibles display
   */
  updateCollectibles(state: CollectionState): void {
    const keyColor = state.hasKey ? 'var(--aw-gold-bright)' : 'rgba(246, 238, 221, 0.35)';
    const keyGlow = state.hasKey ? 'text-shadow: 0 0 12px rgba(243, 212, 137, 0.6);' : '';

    this.collectiblesDisplay.innerHTML = `
      <div style="margin-bottom: 8px; color: ${keyColor}; ${keyGlow} letter-spacing: 0.06em;">
        🗝 ${state.hasKey ? 'Golden Key' : 'Key not found'}
      </div>
      <div style="color: var(--aw-rose); letter-spacing: 0.1em;">
        🃏 ${state.cards} <span style="opacity: 0.55">/ ${state.totalCards}</span>
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
    this.messageDisplay.style.fontSize = '20px';
    this.showMessage(text, 4000);
    setTimeout(() => {
      this.messageDisplay.style.fontSize = '32px';
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
      small: { label: 'Small', color: 'var(--aw-rose)' },
      normal: { label: 'Normal', color: 'var(--aw-parchment)' },
      large: { label: 'Grand', color: 'var(--aw-lilac)' }
    };

    const info = sizeInfo[size];
    this.sizeIndicator.textContent = info.label;
    this.sizeIndicator.style.color = info.color;

    // Flash effect on change
    this.sizeIndicator.style.transform = 'scale(1.18)';
    setTimeout(() => {
      this.sizeIndicator.style.transform = 'scale(1)';
    }, 220);
  }

  /**
   * Brief warm screen flash (for checkpoint hit)
   */
  flashScreen(): void {
    const flashOverlay = document.createElement('div');
    flashOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse at center, rgba(243, 212, 137, 0.9), rgba(255, 255, 255, 0.6));
      opacity: 0;
      pointer-events: none;
      z-index: 999;
    `;
    this.container.appendChild(flashOverlay);

    requestAnimationFrame(() => {
      flashOverlay.style.transition = 'opacity 0.1s ease-out';
      flashOverlay.style.opacity = '0.35';

      setTimeout(() => {
        flashOverlay.style.transition = 'opacity 0.15s ease-in';
        flashOverlay.style.opacity = '0';

        setTimeout(() => {
          this.container.removeChild(flashOverlay);
        }, 150);
      }, 100);
    });
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
    stats: { cards: number; totalCards: number },
    onComplete: () => void
  ): void {
    this.showCelebration('Chapter Complete', `Chapter ${chapterNum}`, stats, 'Entering the next chapter…', 3000, onComplete);
  }

  /**
   * Show level complete celebration (single level mode)
   */
  showLevelComplete(
    levelName: string,
    stats: { cards: number; totalCards: number },
    onComplete: () => void
  ): void {
    this.showCelebration('Curtain Call', levelName, stats, 'You conquered Wonderland!', 4000, onComplete);
  }

  /**
   * Shared celebration overlay
   */
  private showCelebration(
    heading: string,
    subheading: string,
    stats: { cards: number; totalCards: number },
    closingLine: string,
    holdMs: number,
    onComplete: () => void
  ): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(14, 10, 24, 0.82);
      -webkit-backdrop-filter: blur(10px) saturate(1.1);
      backdrop-filter: blur(10px) saturate(1.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 500;
      opacity: 0;
      transition: opacity 0.5s;
    `;

    const title = document.createElement('h1');
    title.textContent = heading;
    title.className = 'aw-display aw-gold-text';
    title.style.cssText = `
      font-size: 64px;
      margin: 0 0 6px 0;
      animation: awPopIn 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    `;
    overlay.appendChild(title);

    const ornament = document.createElement('div');
    ornament.className = 'aw-ornament';
    ornament.textContent = '❦';
    ornament.style.cssText = 'width: 300px; margin: 10px 0 24px 0;';
    overlay.appendChild(ornament);

    const nameElem = document.createElement('p');
    nameElem.textContent = subheading;
    nameElem.style.cssText = `
      font-family: var(--aw-font-text);
      font-style: italic;
      font-size: 28px;
      color: var(--aw-lilac);
      margin: 0 0 36px 0;
    `;
    overlay.appendChild(nameElem);

    const statsDiv = document.createElement('div');
    statsDiv.style.cssText = `
      font-family: var(--aw-font-text);
      font-size: 24px;
      color: var(--aw-rose);
      letter-spacing: 0.1em;
      margin-bottom: 36px;
    `;
    statsDiv.textContent = `🃏 Cards ${stats.cards} / ${stats.totalCards}`;
    overlay.appendChild(statsDiv);

    const completeText = document.createElement('p');
    completeText.textContent = closingLine;
    completeText.style.cssText = `
      font-family: var(--aw-font-text);
      font-style: italic;
      font-size: 20px;
      color: var(--aw-parchment);
      opacity: 0.7;
    `;
    overlay.appendChild(completeText);

    document.body.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // Wait then fade out and callback
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(overlay);
        onComplete();
      }, 500);
    }, holdMs);
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
