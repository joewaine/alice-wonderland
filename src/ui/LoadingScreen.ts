/**
 * LoadingScreen - Shows loading progress while game initializes
 *
 * Displays "Loading Wonderland..." with animated progress bar
 * and whimsical Alice-themed visuals.
 */

export class LoadingScreen {
  private container: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private statusText: HTMLDivElement;
  private progress: number = 0;

  constructor() {
    // Container
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
      z-index: 2000;
    `;

    // Add floating particles
    this.addParticles();

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Alice in Wonderland';
    title.style.cssText = `
      font-size: 48px;
      color: #ffd700;
      text-shadow: 0 0 20px #ffd700;
      margin: 0 0 10px 0;
      letter-spacing: 3px;
    `;
    this.container.appendChild(title);

    // Loading text
    const loadingText = document.createElement('p');
    loadingText.textContent = 'Loading Wonderland...';
    loadingText.style.cssText = `
      font-size: 20px;
      color: #e0b0ff;
      margin: 0 0 30px 0;
      font-style: italic;
    `;
    this.container.appendChild(loadingText);

    // Progress bar container
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      width: 300px;
      height: 20px;
      background: rgba(0,0,0,0.5);
      border: 2px solid #ffd700;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 20px;
    `;
    this.container.appendChild(this.progressBar);

    // Progress fill
    this.progressFill = document.createElement('div');
    this.progressFill.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #9370db 0%, #ffd700 100%);
      border-radius: 8px;
      transition: width 0.3s ease;
    `;
    this.progressBar.appendChild(this.progressFill);

    // Status text
    this.statusText = document.createElement('p');
    this.statusText.textContent = 'Initializing...';
    this.statusText.style.cssText = `
      font-size: 14px;
      color: #888;
      margin: 0;
    `;
    this.container.appendChild(this.statusText);

    // Rabbit icon (CSS art)
    const rabbit = document.createElement('div');
    rabbit.innerHTML = '🐰';
    rabbit.style.cssText = `
      font-size: 40px;
      margin-top: 30px;
      animation: bounce 1s ease-in-out infinite;
    `;
    this.container.appendChild(rabbit);

    // Add bounce animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes float-particle {
        0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Add floating particles
   */
  private addParticles(): void {
    const symbols = ['♠', '♥', '♦', '♣', '🗝️', '⭐'];

    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      particle.style.cssText = `
        position: absolute;
        font-size: ${Math.random() * 20 + 15}px;
        color: rgba(255,215,0,0.3);
        left: ${Math.random() * 100}%;
        animation: float-particle ${Math.random() * 10 + 10}s linear infinite;
        animation-delay: ${Math.random() * 10}s;
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
