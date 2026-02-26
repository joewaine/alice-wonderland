/**
 * MainMenu - Title screen and pause menu
 *
 * Shows "Alice in Wonderland" title with "Begin Journey" button.
 * Also handles pause menu with ESC key.
 */

import { audioManager } from '../audio/AudioManager';

export class MainMenu {
  private container: HTMLDivElement;
  private pauseOverlay: HTMLDivElement;
  private isPaused: boolean = false;

  // Callbacks
  public onStart: (() => void) | null = null;
  public onResume: (() => void) | null = null;
  public onRestart: (() => void) | null = null;

  constructor() {
    // Main menu container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #4a2c6e 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Georgia', serif;
      z-index: 1000;
    `;

    // Decorative stars
    this.addStars();

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Alice in Wonderland';
    title.style.cssText = `
      font-size: 64px;
      color: #ffd700;
      text-shadow: 0 0 20px #ffd700, 0 4px 8px rgba(0,0,0,0.5);
      margin: 0 0 10px 0;
      letter-spacing: 4px;
      animation: float 3s ease-in-out infinite;
    `;
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'A Wonderland Platformer';
    subtitle.style.cssText = `
      font-size: 24px;
      color: #e0b0ff;
      margin: 0 0 60px 0;
      font-style: italic;
    `;
    this.container.appendChild(subtitle);

    // Start button
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Begin Journey';
    startBtn.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 28px;
      padding: 20px 50px;
      background: linear-gradient(135deg, #9370db 0%, #6b4e9e 100%);
      color: white;
      border: 3px solid #ffd700;
      border-radius: 30px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    `;
    startBtn.onmouseenter = () => {
      audioManager.playUIHover();
    };
    startBtn.onmouseover = () => {
      startBtn.style.transform = 'scale(1.1)';
      startBtn.style.boxShadow = '0 8px 30px rgba(255,215,0,0.4)';
    };
    startBtn.onmouseout = () => {
      startBtn.style.transform = 'scale(1)';
      startBtn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    };
    startBtn.onclick = () => {
      this.hide();
      if (this.onStart) this.onStart();
    };
    this.container.appendChild(startBtn);

    // Controls hint
    const controls = document.createElement('p');
    controls.innerHTML = `
      <span style="color: #888;">WASD</span> Move &nbsp;
      <span style="color: #888;">Space</span> Jump &nbsp;
      <span style="color: #888;">Q/R</span> Shrink/Grow &nbsp;
      <span style="color: #888;">E</span> Talk
    `;
    controls.style.cssText = `
      position: absolute;
      bottom: 40px;
      font-size: 16px;
      color: #aaa;
    `;
    this.container.appendChild(controls);

    // Add keyframe animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);

    // Pause overlay (hidden by default)
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Georgia', serif;
      z-index: 900;
    `;

    const pauseTitle = document.createElement('h2');
    pauseTitle.textContent = 'Paused';
    pauseTitle.style.cssText = `
      font-size: 48px;
      color: #ffd700;
      margin-bottom: 40px;
    `;
    this.pauseOverlay.appendChild(pauseTitle);

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
   * Add decorative floating stars
   */
  private addStars(): void {
    for (let i = 0; i < 30; i++) {
      const star = document.createElement('div');
      star.style.cssText = `
        position: absolute;
        width: ${Math.random() * 4 + 2}px;
        height: ${Math.random() * 4 + 2}px;
        background: white;
        border-radius: 50%;
        opacity: ${Math.random() * 0.5 + 0.3};
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        animation: twinkle ${Math.random() * 2 + 1}s ease-in-out infinite;
        animation-delay: ${Math.random() * 2}s;
      `;
      this.container.appendChild(star);
    }

    const twinkleStyle = document.createElement('style');
    twinkleStyle.textContent = `
      @keyframes twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.8; }
      }
    `;
    document.head.appendChild(twinkleStyle);
  }

  /**
   * Create a styled menu button
   */
  private createMenuButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 24px;
      padding: 15px 40px;
      margin: 10px;
      background: linear-gradient(135deg, #9370db 0%, #6b4e9e 100%);
      color: white;
      border: 2px solid #ffd700;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    btn.onmouseenter = () => {
      audioManager.playUIHover();
    };
    btn.onmouseover = () => {
      btn.style.transform = 'scale(1.05)';
    };
    btn.onmouseout = () => {
      btn.style.transform = 'scale(1)';
    };
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
