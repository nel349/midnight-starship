import { defineConfig, type Plugin } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Inject timingSafeEqual shim into the crypto polyfill
function cryptoTimingSafeEqualShim(): Plugin {
  return {
    name: 'crypto-timing-safe-equal-shim',
    transform(code, id) {
      // Patch the crypto-browserify entry to add timingSafeEqual
      if (id.includes('crypto-browserify') && id.endsWith('index.js')) {
        const shim = `
;(function() {
  var orig = module.exports;
  if (!orig.timingSafeEqual) {
    orig.timingSafeEqual = function timingSafeEqual(a, b) {
      if (a.length !== b.length) throw new RangeError('Input buffers must have the same byte length');
      var result = 0;
      for (var i = 0; i < a.length; i++) result |= a[i] ^ b[i];
      return result === 0;
    };
  }
})();`;
        return { code: code + shim, map: null };
      }
      return null;
    },
  };
}

export default defineConfig({
  cacheDir: './.vite',
  build: {
    target: 'esnext',
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          wasm: ['@midnight-ntwrk/onchain-runtime-v2'],
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
    nodePolyfills({
      include: ['crypto', 'buffer', 'stream', 'assert', 'events', 'path', 'fs', 'util', 'vm'],
    }),
    cryptoTimingSafeEqualShim(),
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
      '@midnight-ntwrk/onchain-runtime-v2',
      '@midnight-ntwrk/onchain-runtime-v2/midnight_onchain_runtime_wasm_bg.wasm',
      '@midnight-ntwrk/onchain-runtime-v2/midnight_onchain_runtime_wasm.js',
    ],
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.wasm'],
    mainFields: ['browser', 'module', 'main'],
  },
});
