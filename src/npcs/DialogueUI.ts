/**
 * DialogueUI - HTML overlay for NPC dialogue
 *
 * Shows a dialogue box with character name and text.
 * Auto-dismisses after timeout or when player walks away.
 */

export class DialogueUI {
  private container: HTMLDivElement;
  private nameElement: HTMLDivElement;
  private textElement: HTMLDivElement;
  private isVisible: boolean = false;
  private dismissTimeout: number | null = null;

  public onDismiss: (() => void) | null = null;

  constructor() {
    // Create container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      max-width: 90vw;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 3px solid #e94560;
      border-radius: 12px;
      padding: 20px;
      font-family: 'Georgia', serif;
      color: white;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 200;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    // Character name
    this.nameElement = document.createElement('div');
    this.nameElement.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #e94560;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    `;
    this.container.appendChild(this.nameElement);

    // Dialogue text
    this.textElement = document.createElement('div');
    this.textElement.style.cssText = `
      font-size: 20px;
      line-height: 1.6;
      font-style: italic;
      color: #eee;
    `;
    this.container.appendChild(this.textElement);

    // Press E hint
    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size: 12px;
      color: #888;
      margin-top: 15px;
      text-align: right;
    `;
    hint.textContent = 'Press E or walk away to dismiss';
    this.container.appendChild(hint);

    document.body.appendChild(this.container);
  }

  /**
   * Show dialogue
   */
  show(name: string, text: string, autoDismissMs: number = 5000): void {
    this.nameElement.textContent = name;
    this.textElement.textContent = `"${text}"`;

    this.container.style.opacity = '1';
    this.isVisible = true;

    // Clear previous timeout
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }

    // Auto-dismiss
    this.dismissTimeout = window.setTimeout(() => {
      this.hide();
    }, autoDismissMs);
  }

  /**
   * Hide dialogue
   */
  hide(): void {
    if (!this.isVisible) return;

    this.container.style.opacity = '0';
    this.isVisible = false;

    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
      this.dismissTimeout = null;
    }

    if (this.onDismiss) {
      this.onDismiss();
    }
  }

  /**
   * Check if dialogue is visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Clean up
   */
  dispose(): void {
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }
    document.body.removeChild(this.container);
  }
}
