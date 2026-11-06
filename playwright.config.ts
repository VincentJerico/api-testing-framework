import { defineConfig } from '@playwright/test';
import { config, DEFAULT_HEADERS } from './src/config/env.js';

/**
 * API-only config: tests use the `request` fixture, so no browser is launched or installed.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: config.baseURL,
    extraHTTPHeaders: DEFAULT_HEADERS,
  },

  projects: [
    // Offline: proves the framework's own gates can fail. Needs no API, so CI runs it first.
    { name: 'selftest', testDir: './tests/selftest' },
    // The API suite, against BASE_URL.
    { name: 'api', testIgnore: 'selftest/**' },
  ],
});
