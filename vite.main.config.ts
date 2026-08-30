import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'sql.js',
        'electron',
        'dns-packet',
        'node:dgram',
        'node:os',
        'node:path',
        'node:fs',
        'node:fs/promises',
        'node:crypto',
        'node:stream',
        'node:stream/promises',
      ],
    },
  },
  resolve: {
    // Ensure node built-ins are not bundled
    conditions: ['node'],
  },
});
