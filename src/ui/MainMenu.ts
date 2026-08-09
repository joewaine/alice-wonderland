/**
 * MainMenu - Title screen and pause menu
 *
 * Gilded Storybook treatment: deep ink backdrop with a radial candle-glow,
 * drifting gold motes, an Italiana wordmark with a live gold shimmer, and
 * ornamented chapter-plate framing. Same public API as before.
 */

import { audioManager } from '../audio/AudioManager';
import { injectTheme } from './theme';

export class MainMenu {
  private container: HTMLDivElement;
  private pauseOverlay: HTMLDivElement;
  private isPaused: boolean = false;

  // Callbacks
  public onStart: (() => void) | null = null;
  public onResume: (() => void) | null = null;
  public onRestart: (() => void) | null = null;

  constructor() {
    injectTheme();

    // Main menu container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 90% 60% at 50% 38%, rgba(212, 175, 95, 0.12), transparent 60%),
        radial-gradient(ellipse 120% 80% at 50% 110%, rgba(62, 139, 102, 0.14), transparent 55%),
        linear-gradient(180deg, #0e0a18 0%, #171122 55%, #241a38 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      overflow: hidden;
    `;

    // Drifting gold motes
    this.addMotes(this.container, 26);

    // Kicker line above the title
    const kicker = document.createElement('p');
    kicker.textContent = 'Down the rabbit hole';
    kicker.className = 'aw-kicker';
    kicker.style.cssText = `
      font-size: 19px;
      margin: 0 0 18px 0;
      text-transform: lowercase;
      animation: awFadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
    `;
    this.container.appendChild(kicker);

    // Title wordmark
    const title = document.createElement('h1');
    title.textContent = 'Alice in Wonderland';
    title.className = 'aw-display aw-gold-text';
    title.style.cssText = `
      font-size: clamp(48px, 8vw, 96px);
      margin: 0;
      text-align: center;
      line-height: 1.05;
      animation: awFadeUp 0.9s 0.12s cubic-bezier(0.22, 1, 0.36, 1) both;
    `;
    this.container.appendChild(title);

    // Ornamented divider
    const ornament = document.createElement('div');
    ornament.className = 'aw-ornament';
    ornament.textContent = '❦';
    ornament.style.cssText = `
      width: min(420px, 60vw);
      margin: 26px 0;
      animation: awFadeUp 0.9s 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
    `;
    this.container.appendChild(ornament);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'A platformer through the Queen’s Garden';
    subtitle.style.cssText = `
      font-family: var(--aw-font-text);
      font-style: italic;
      font-size: 22px;
      color: var(--aw-parchment);
      opacity: 0.75;
      margin: 0 0 56px 0;
      animation: awFadeUp 0.9s 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
    `;
    this.container.appendChild(subtitle);

    // Start button
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Begin the Journey';
    startBtn.className = 'aw-btn';
    startBtn.style.animation = 'awFadeUp 0.9s 0.44s cubic-bezier(0.22, 1, 0.36, 1) both';
    startBtn.onmouseenter = () => audioManager.playUIHover();
    startBtn.onclick = () => {
      this.hide();
      if (this.onStart) this.onStart();
    };
    this.container.appendChild(startBtn);

    // Controls hint
    const controls = document.createElement('p');
    controls.innerHTML = `
      <span class="aw-kbd">WASD</span> Move
      <span style="opacity:0.35; margin: 0 10px;">·</span>
      <span class="aw-kbd">Space</span> Jump
      <span style="opacity:0.35; margin: 0 10px;">·</span>
      <span class="aw-kbd">Q</span><span class="aw-kbd">R</span> Shrink / Grow
      <span style="opacity:0.35; margin: 0 10px;">·</span>
      <span class="aw-kbd">E</span> Talk
    `;
    controls.style.cssText = `
      position: absolute;
      bottom: 36px;
      font-family: var(--aw-font-text);
      font-size: 17px;
      color: var(--aw-parchment);
      opacity: 0.65;
      animation: awFadeUp 0.9s 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    `;
    this.container.appendChild(controls);

    // Pause overlay (hidden by default)
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(14, 10, 24, 0.72);
      -webkit-backdrop-filter: blur(10px) saturate(1.1);
      backdrop-filter: blur(10px) saturate(1.1);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 900;
    `;

    const pauseTitle = document.createElement('h2');
    pauseTitle.textContent = 'Paused';
    pauseTitle.className = 'aw-display aw-gold-text';
    pauseTitle.style.cssText = `
      font-size: 56px;
      margin: 0 0 8px 0;
    `;
    this.pauseOverlay.appendChild(pauseTitle);

    const pauseOrnament = document.createElement('div');
    pauseOrnament.className = 'aw-ornament';
    pauseOrnament.textContent = '❦';
    pauseOrnament.style.cssText = 'width: 260px; margin: 12px 0 36px 0;';
    this.pauseOverlay.appendChild(pauseOrnament);

    // Resume button
    const resumeBtn = this.createMenuButton('Resume', () => {
      this.unpause();
      if (this.onResume) this.onResume();
    });
    this.pauseOverlay.appendChild(resumeBtn);

    // Restart button
    const restartBtn = this.createMenuButton('Restart Chapter', () => {
      this.unpause();
      if (this.onRestart) this.onRestart();
    });
    this.pauseOverlay.appendChild(restartBtn);

    document.body.appendChild(this.pauseOverlay);

    // ESC key listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.container.style.display !== 'none') return; // Don't pause on main menu
        if (this.isPaused) {
          this.unpause();
          if (this.onResume) this.onResume();
        } else {
          this.pause();
        }
      }
    });
  }

  /**
   * Add drifting gold motes to a container
   */
  private addMotes(parent: HTMLElement, count: number): void {
    for (let i = 0; i < count; i++) {
      const mote = document.createElement('div');
      const size = Math.random() * 3 + 1.5;
      mote.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: var(--aw-gold-bright);
        border-radius: 50%;
        box-shadow: 0 0 ${size * 3}px rgba(243, 212, 137, 0.8);
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        opacity: ${Math.random() * 0.4 + 0.15};
        animation:
          awTwinkle ${Math.random() * 3 + 2}s ease-in-out infinite,
          awFloat ${Math.random() * 6 + 6}s ease-in-out infinite;
        animation-delay: ${Math.random() * 4}s, ${Math.random() * 6}s;
        pointer-events: none;
      `;
      parent.appendChild(mote);
    }
  }

  /**
   * Create a styled menu button
   */
  private createMenuButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = 'aw-btn aw-btn--small';
    btn.style.margin = '10px';
    btn.onmouseenter = () => audioManager.playUIHover();
    btn.onclick = onClick;
    return btn;
  }

  /**
   * Show main menu
   */
  show(): void {
    document.body.appendChild(this.container);
    this.container.style.display = 'flex';
  }

  /**
   * Hide main menu
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Pause the game
   */
  pause(): void {
    this.isPaused = true;
    this.pauseOverlay.style.display = 'flex';
  }

  /**
   * Unpause the game
   */
  unpause(): void {
    this.isPaused = false;
    this.pauseOverlay.style.display = 'none';
  }

  /**
   * Check if paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Clean up
   */
  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.pauseOverlay.parentNode) {
      this.pauseOverlay.parentNode.removeChild(this.pauseOverlay);
    }
  }
}
