/**
 * DialogueUI - HTML overlay for NPC dialogue
 *
 * Shows a dialogue box with character name and text.
 * Auto-dismisses after timeout or when player walks away.
 */

export class DialogueUI {
  private container: HTMLDivElement;
  private contentWrapper: HTMLDivElement;
  private portraitElement: HTMLImageElement;
  private textWrapper: HTMLDivElement;
  private nameElement: HTMLDivElement;
  private textElement: HTMLDivElement;
  private isVisible: boolean = false;
  private dismissTimeout: number | null = null;
  private styleElement: HTMLStyleElement | null = null;

  public onDismiss: (() => void) | null = null;

  constructor() {
    // Inject pop-in animation keyframes
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      @keyframes dialoguePopIn {
        0% { transform: scale(0.8); opacity: 0; }
        70% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(this.styleElement);

    // Create container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      width: 650px;
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

    // Content wrapper (portrait + text side by side)
    this.contentWrapper = document.createElement('div');
    this.contentWrapper.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 20px;
    `;
    this.container.appendChild(this.contentWrapper);

    // Portrait image
    this.portraitElement = document.createElement('img');
    this.portraitElement.style.cssText = `
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid #e94560;
      object-fit: cover;
      background: #2a2a4e;
      flex-shrink: 0;
    `;
    this.portraitElement.alt = 'Character portrait';
    this.contentWrapper.appendChild(this.portraitElement);

    // Text wrapper
    this.textWrapper = document.createElement('div');
    this.textWrapper.style.cssText = `
      flex: 1;
      min-width: 0;
      transform-origin: left center;
    `;
    this.contentWrapper.appendChild(this.textWrapper);

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
    this.textWrapper.appendChild(this.nameElement);

    // Dialogue text
    this.textElement = document.createElement('div');
    this.textElement.style.cssText = `
      font-size: 20px;
      line-height: 1.6;
      font-style: italic;
      color: #eee;
    `;
    this.textWrapper.appendChild(this.textElement);

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
   * Show dialogue with optional portrait
   * portraitDataUrl: if provided, used directly as the portrait image src
   */
  show(name: string, text: string, portraitId?: string, autoDismissMs: number = 5000, portraitDataUrl?: string): void {
    this.nameElement.textContent = name;
    this.textElement.textContent = `"${text}"`;

    // Load portrait — prefer rendered data URL, then file, then placeholder
    if (portraitDataUrl) {
      this.portraitElement.src = portraitDataUrl;
      this.portraitElement.style.display = 'block';
    } else if (portraitId) {
      // Try to load portrait image, fallback to placeholder
      const portraitPath = `${import.meta.env.BASE_URL}assets/portraits/${portraitId}.png`;
      this.portraitElement.src = portraitPath;
      this.portraitElement.onerror = () => {
        this.setPlaceholderPortrait(name);
      };
      this.portraitElement.style.display = 'block';
    } else {
      this.setPlaceholderPortrait(name);
    }

    this.container.style.opacity = '1';
    this.isVisible = true;

    // Trigger pop-in animation on text wrapper
    this.textWrapper.style.animation = 'none';
    // Force reflow to restart animation
    void this.textWrapper.offsetHeight;
    this.textWrapper.style.animation = 'dialoguePopIn 0.15s ease-out forwards';

    // Clear previous timeout
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }

    // Auto-dismiss
    this.dismissTimeout = window.setTimeout(() => {
      this.hide();
    }, autoDismissMs);
  }

  // Character color palette for placeholder portraits
  private readonly CHARACTER_COLORS: Record<string, [string, string]> = {
    // Royalty - rich reds and golds
    'queen': ['#DC143C', '#8B0000'],      // Crimson
    'king': ['#FFD700', '#B8860B'],        // Gold
    'knave': ['#C71585', '#8B008B'],       // MediumVioletRed
    // Card Painters - playing card theme
    'card': ['#2F4F4F', '#1C1C1C'],        // DarkSlateGray
    // Mad Tea Party - whimsical purples/teals
    'hatter': ['#9932CC', '#4B0082'],      // DarkOrchid
    'march': ['#20B2AA', '#008080'],       // LightSeaGreen
    'dormouse': ['#DEB887', '#8B7355'],    // BurlyWood
    // Wonderland creatures
    'cheshire': ['#FF69B4', '#C71585'],    // HotPink
    'white rabbit': ['#F5F5DC', '#B0A090'],// Beige
    'rabbit': ['#F5F5DC', '#B0A090'],      // Beige
    'flamingo': ['#FF6B6B', '#FF1493'],    // Coral/DeepPink
    'hedgehog': ['#8B4513', '#5D3A1A'],    // SaddleBrown
    // Caterpillar
    'caterpillar': ['#32CD32', '#228B22'], // LimeGreen
    // Tweedles
    'tweedle': ['#4169E1', '#1E3A8A'],     // RoyalBlue
  };

  /**
   * Get character colors based on name
   */
  private getCharacterColors(name: string): [string, string] {
    const nameLower = name.toLowerCase();

    for (const [key, colors] of Object.entries(this.CHARACTER_COLORS)) {
      if (nameLower.includes(key)) {
        return colors;
      }
    }

    // Default purple for unknown characters
    return ['#9370db', '#6b4e9e'];
  }

  /**
   * Set a placeholder portrait with the character's initial
   */
  private setPlaceholderPortrait(name: string): void {
    const initial = name.charAt(0).toUpperCase();
    const [colorLight, colorDark] = this.getCharacterColors(name);

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

    // Background gradient with character-specific colors
    const gradient = ctx.createRadialGradient(50, 50, 0, 50, 50, 50);
    gradient.addColorStop(0, colorLight);
    gradient.addColorStop(1, colorDark);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2);
    ctx.fill();

    // Add subtle border ring
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(50, 50, 46, 0, Math.PI * 2);
    ctx.stroke();

    // Initial letter with shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, 50, 52);

    this.portraitElement.src = canvas.toDataURL();
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
    if (this.styleElement) {
      document.head.removeChild(this.styleElement);
    }
  }
}
