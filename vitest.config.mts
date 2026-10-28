import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@ionic/core/components': resolve(__dirname, 'node_modules/@ionic/core/components/index.js'),
      '@ionic/core/loader': resolve(__dirname, 'node_modules/@ionic/core/loader/index.js'),
    },
  },
  test: {
    // Angular's unit-test builder bundles each spec with the code it imports, and
    // Vitest's file-system module cache can then serve a stale bundle after a
    // non-spec file changes. Turn the cache off so reruns always test current code.
    fsModuleCache: false,
  },
});
