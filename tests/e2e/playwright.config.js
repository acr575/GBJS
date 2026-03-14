// Playwright config for loading the built app and running ROM-driven tests
const { devices } = require('@playwright/test')
module.exports = {
  testDir: './',
  timeout: 120000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 800, height: 600 },
    actionTimeout: 0,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
}