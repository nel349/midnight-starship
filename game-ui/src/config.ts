// Game configuration
export const VIRTUAL_WIDTH = 320;
export const VIRTUAL_HEIGHT = 240;
export const SCALE = 3;

// Network configuration
// Set VITE_WALLET_URL to connect via WebSocket (midnight serve).
// Leave unset to auto-discover the Lace browser extension.
export const WALLET_URL = import.meta.env.VITE_WALLET_URL ?? '';
export const NETWORK_ID = import.meta.env.VITE_NETWORK_ID ?? 'Undeployed';

// Private state provider configuration
export const PRIVATE_STATE_STORE_NAME = 'starship-private-state';
export const PRIVATE_STATE_PASSWORD = 'starship-demo-password-16chars';
export const PRIVATE_STATE_ACCOUNT_ID = 'starship-player';

// Proof server fallback
export const DEFAULT_PROVER_URI = 'http://localhost:6300';
