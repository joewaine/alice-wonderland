/**
 * theme - "Gilded Storybook" design system
 *
 * One injected stylesheet that every UI component draws from: a Victorian
 * storybook palette (ink, parchment, antique gold, rose, lilac), display
 * serif typography, glass panels, and the shared animation vocabulary.
 *
 * Fonts (Italiana, Cormorant Garamond) are loaded from index.html so they
 * are already in flight before any UI constructs.
 */

const THEME_STYLE_ID = 'aw-theme';

const themeCss = /* css */ `
  :root {
    --aw-ink: #171122;
    --aw-ink-deep: #0e0a18;
    --aw-parchment: #f6eedd;
    --aw-gold: #d4af5f;
    --aw-gold-bright: #f3d489;
    --aw-gold-dim: #9a7c3f;
    --aw-rose: #d85a74;
    --aw-emerald: #3e8b66;
    --aw-lilac: #b9a3e3;
    --aw-font-display: 'Italiana', 'Georgia', serif;
    --aw-font-text: 'Cormorant Garamond', 'Georgia', serif;
  }

  /* --- Glass panel: the base surface for all HUD chrome --- */
  .aw-panel {
    background: linear-gradient(160deg, rgba(23, 17, 34, 0.62), rgba(14, 10, 24, 0.72));
    -webkit-backdrop-filter: blur(14px) saturate(1.25);
    backdrop-filter: blur(14px) saturate(1.25);
    border: 1px solid rgba(212, 175, 95, 0.45);
    border-radius: 14px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(243, 212, 137, 0.18),
      inset 0 0 24px rgba(212, 175, 95, 0.05);
    color: var(--aw-parchment);
    font-family: var(--aw-font-text);
  }

  /* --- Typography --- */
  .aw-display {
    font-family: var(--aw-font-display);
    letter-spacing: 0.06em;
    font-weight: 400;
  }

  .aw-gold-text {
    background: linear-gradient(
      100deg,
      var(--aw-gold-dim) 0%,
      var(--aw-gold-bright) 30%,
      #fff6dd 50%,
      var(--aw-gold-bright) 70%,
      var(--aw-gold-dim) 100%
    );
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    animation: awShimmer 6s ease-in-out infinite;
  }

  .aw-kicker {
    font-family: var(--aw-font-text);
    font-style: italic;
    color: var(--aw-lilac);
    letter-spacing: 0.14em;
  }

  /* --- Ornamental divider: — ❦ — --- */
  .aw-ornament {
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--aw-gold);
    font-size: 18px;
    opacity: 0.85;
  }
  .aw-ornament::before,
  .aw-ornament::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--aw-gold), transparent);
  }

  /* --- Buttons --- */
  .aw-btn {
    font-family: var(--aw-font-display);
    font-size: 22px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--aw-gold-bright);
    background: rgba(23, 17, 34, 0.45);
    border: 1px solid rgba(212, 175, 95, 0.65);
    border-radius: 999px;
    padding: 16px 52px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35), inset 0 0 0 rgba(212, 175, 95, 0);
  }
  .aw-btn:hover {
    color: var(--aw-ink-deep);
    background: linear-gradient(120deg, var(--aw-gold), var(--aw-gold-bright));
    border-color: var(--aw-gold-bright);
    box-shadow:
      0 6px 32px rgba(212, 175, 95, 0.35),
      0 0 60px rgba(212, 175, 95, 0.18);
    transform: translateY(-2px);
  }
  .aw-btn:active {
    transform: translateY(0);
  }

  .aw-btn--small {
    font-size: 17px;
    padding: 12px 36px;
  }

  /* --- Key hints (kbd chips) --- */
  .aw-kbd {
    display: inline-block;
    font-family: var(--aw-font-text);
    font-weight: 600;
    font-size: 0.92em;
    color: var(--aw-gold-bright);
    border: 1px solid rgba(212, 175, 95, 0.5);
    border-radius: 6px;
    padding: 1px 8px;
    margin-right: 4px;
    background: rgba(212, 175, 95, 0.08);
  }

  /* --- Animation vocabulary --- */
  @keyframes awShimmer {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes awFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes awFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes awTwinkle {
    0%, 100% { opacity: 0.25; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.25); }
  }
  @keyframes awPopIn {
    0% { transform: scale(0.92); opacity: 0; }
    70% { transform: scale(1.02); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes awDriftUp {
    0% { transform: translateY(105vh) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-8vh) rotate(340deg); opacity: 0; }
  }
  @keyframes awBreathe {
    0%, 100% { opacity: 0.65; }
    50% { opacity: 1; }
  }
`;

/**
 * Inject the theme stylesheet into <head>. Idempotent — safe to call from
 * every component constructor. Lives in <head> because Game clears <body>.
 */
export function injectTheme(): void {
  if (document.getElementById(THEME_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = THEME_STYLE_ID;
  style.textContent = themeCss;
  document.head.appendChild(style);
}
