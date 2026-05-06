import { defineConfig } from 'vite';

export default defineConfig({

    base: process.env.VITE_CONFIG_BASE || '/custle-to-custle/',
    root: '.',
    server: { open: true },
    build: { outDir: 'dist' },
});
