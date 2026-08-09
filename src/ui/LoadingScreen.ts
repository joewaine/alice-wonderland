/**
 * LoadingScreen - Shows loading progress while game initializes
 *
 * Gilded Storybook treatment: ink backdrop, shimmering wordmark, a thin
 * gold progress filament, and card suits drifting up like embers.
 */

import { injectTheme } from './theme';

export class LoadingScreen {
  private container: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private statusText: HTMLDivElement;
  private progress: number = 0;

  constructor() {
    injectTheme();

    // Container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 90% 60% at 50% 40%, rgba(212, 175, 95, 0.10), transparent 60%),
        linear-gradient(180deg, #0e0a18 0%, #171122 55%, #241a38 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      overflow: hidden;
    `;

    // Drifting card suits
    this.addParticles();

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Alice in Wonderland';
    title.className = 'aw-display aw-gold-text';
    title.style.cssText = `
      font-size: clamp(40px, 6vw, 64px);
      margin: 0 0 6px 0;
      text-align: center;
    `;
    this.container.appendChild(title);

    // Loading text
    const loadingText = document.createElement('p');
    loadingText.textContent = 'Falling into Wonderland…';
    loadingText.className = 'aw-kicker';
    loadingText.style.cssText = `
      font-size: 20px;
      margin: 0 0 48px 0;
      animation: awBreathe 2.4s ease-in-out infinite;
    `;
    this.container.appendChild(loadingText);

    // Progress filament: a thin gold line that fills left to right
    const progressTrack = document.createElement('div');
    progressTrack.style.cssText = `
      width: min(340px, 70vw);
      height: 2px;
      background: rgba(212, 175, 95, 0.18);
      border-radius: 2px;
      overflow: visible;
      margin-bottom: 22px;
    `;
    this.container.appendChild(progressTrack);

    this.progressFill = document.createElement('div');
    this.progressFill.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, var(--aw-gold-dim), var(--aw-gold-bright));
      border-radius: 2px;
      box-shadow: 0 0 12px rgba(243, 212, 137, 0.7);
      transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    `;
    progressTrack.appendChild(this.progressFill);

    // Status text
    this.statusText = document.createElement('p');
    this.statusText.textContent = 'Initializing…';
    this.statusText.style.cssText = `
      font-family: var(--aw-font-text);
      font-size: 16px;
      color: var(--aw-parchment);
      opacity: 0.55;
      margin: 0;
      letter-spacing: 0.06em;
    `;
    this.container.appendChild(this.statusText);
  }

  /**
   * Add drifting card-suit particles
   */
  private addParticles(): void {
    const symbols = ['♠', '♥', '♦', '♣', '❦'];

    for (let i = 0; i < 14; i++) {
      const particle = document.createElement('div');
      particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      const isRed = particle.textContent === '♥' || particle.textContent === '♦';
      particle.style.cssText = `
        position: absolute;
        font-size: ${Math.random() * 16 + 12}px;
        color: ${isRed ? 'rgba(216, 90, 116, 0.28)' : 'rgba(212, 175, 95, 0.25)'};
        left: ${Math.random() * 100}%;
        animation: awDriftUp ${Math.random() * 12 + 12}s linear infinite;
        animation-delay: ${Math.random() * 12}s;
        pointer-events: none;
      `;
      this.container.appendChild(particle);
    }
  }

  /**
   * Show the loading screen
   */
  show(): void {
    document.body.appendChild(this.container);
  }

  /**
   * Update progress (0-100)
   */
  setProgress(percent: number, status?: string): void {
    this.progress = Math.max(0, Math.min(100, percent));
    this.progressFill.style.width = `${this.progress}%`;

    if (status) {
      this.statusText.textContent = status;
    }
  }

  /**
   * Hide and remove the loading screen
   */
  hide(): void {
    this.container.style.transition = 'opacity 0.5s ease';
    this.container.style.opacity = '0';

    setTimeout(() => {
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }, 500);
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.container.parentNode !== null;
  }
}
