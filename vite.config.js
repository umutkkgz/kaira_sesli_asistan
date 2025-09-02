const { defineConfig } = require('vite');

// Use index.html at project root as entry (Vite default)
// and output to dist. Keep server friendly defaults.
module.exports = defineConfig({
  root: '.',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 5173 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});
