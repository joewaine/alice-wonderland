/**
 * Alice in Wonderland - Main Entry Point
 *
 * Initializes and starts the game.
 */

import { Game } from './Game';

async function main() {
  console.log('Starting Alice in Wonderland...');

  // Create and initialize game
  const game = new Game();
  await game.init();

  // Start the game loop
  game.start();

  console.log('Game running!');
}

// Start the game
main().catch((error) => {
  console.error('Failed to start game:', error);

  // Show error to user
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #1a1a2e;
      color: white;
      font-family: monospace;
      text-align: center;
    ">
      <div>
        <h1>Failed to start game</h1>
        <p style="color: #ff6b6b">${error.message}</p>
        <p>Check the console for details.</p>
      </div>
    </div>
  `;
});
