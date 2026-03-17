// Game state machine

export type GameScreen =
  | 'connect'      // Wallet connection screen
  | 'menu'         // Title screen
  | 'playing'      // Active gameplay
  | 'gameover'     // Death screen — prompt to submit score
  | 'submitting'   // Submitting score to chain
  | 'leaderboard'; // Viewing on-chain leaderboard

let currentScreen: GameScreen = 'connect';
let screenTransitionTimer = 0;

export function getScreen(): GameScreen {
  return currentScreen;
}

export function setScreen(screen: GameScreen): void {
  currentScreen = screen;
  screenTransitionTimer = 0;
}

export function getScreenTimer(): number {
  return screenTransitionTimer;
}

export function updateScreenTimer(dt: number): void {
  screenTransitionTimer += dt;
}
