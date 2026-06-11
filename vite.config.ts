import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite serves /src/main.tsx in dev and produces a static bundle in
// /dist on `vite build`. The output of `vite build` is what we ship
// to GitHub Pages (or any static host).
//
// `base` controls the URL prefix that Vite hard-codes into asset
// references. GitHub Pages serves project sites at
//   https://<user>.github.io/<repo>/
// so the prefix has to be `/<repo>/`. The deploy workflow passes
// the repo name via VITE_BASE; locally we leave it as '/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
});
