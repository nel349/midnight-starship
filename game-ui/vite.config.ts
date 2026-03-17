import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  cacheDir: './.vite',
  build: {
    target: 'esnext',
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          wasm: ['@midnight-ntwrk/onchain-runtime'],
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      extensions: ['.js', '.cjs'],
      ignoreDynamicRequires: true,
    },
  },
  plugins: [
    wasm(),
    topLevelAwait({
      promiseExportName: '__tla',
      promiseImportName: (i: number) => `__tla_${i}`,
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      supported: { 'top-level-await': true },
      platform: 'browser',
      format: 'esm',
    },
    include: ['@midnight-ntwrk/compact-runtime'],
    exclude: [
      '@midnight-ntwrk/onchain-runtime',
      '@midnight-ntwrk/onchain-runtime/midnight_onchain_runtime_wasm_bg.wasm',
      '@midnight-ntwrk/onchain-runtime/midnight_onchain_runtime_wasm.js',
    ],
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.wasm'],
    mainFields: ['browser', 'module', 'main'],
  },
});
