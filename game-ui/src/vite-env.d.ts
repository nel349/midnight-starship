/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLET_URL?: string;
  readonly VITE_NETWORK_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
