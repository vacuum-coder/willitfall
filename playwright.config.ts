import { defineConfig } from '@playwright/test';

// Visual regression: the approved screens are the baseline; any visible change outside
// the 3D view (more than 3 % of its pixels inside it) fails the run. Runs against the production build.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  // Rendering is deterministic on one machine: outside the 3D no pixel may change (a single letter fails the run).
  expect: { toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.1, animations: 'disabled' } },
  use: {
    baseURL: 'http://localhost:4174',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: { command: 'npm run build && npx vite preview --port 4174 --strictPort', url: 'http://localhost:4174', reuseExistingServer: false, timeout: 180_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  ],
});
