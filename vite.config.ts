/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Phones from about 2020 on (iOS 14, Android Chrome 87): the default target needs 2023 browsers and old phones got a blank page.
  build: { target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'] },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
