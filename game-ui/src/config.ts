// Game configuration
export const VIRTUAL_WIDTH = 320;
export const VIRTUAL_HEIGHT = 240;
export const SCALE = 3;

// Network configuration
export const WALLET_URL = import.meta.env.VITE_WALLET_URL ?? 'ws://localhost:9932';
export const NETWORK_ID = import.meta.env.VITE_NETWORK_ID ?? 'Undeployed';
