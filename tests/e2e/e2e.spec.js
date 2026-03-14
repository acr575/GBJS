const { test, expect } = require('@playwright/test')
const path = require('path')

// Simple E2E: serve dist, load the page, inject a ROM file and ensure canvas exists

test('load ROM file and render screen', async ({ page }) => {
  // The CI will serve ./dist at http://localhost:8080
  await page.goto('http://localhost:8080')

  // Ensure file input exists
  const fileInput = await page.$('#fileInput')
  expect(fileInput).not.toBeNull()

  // If a ROM is available at tests/roms/sample.gb, run it
  const romPath = path.resolve('tests/roms/sample.gb')
  const fs = require('fs')
  if (fs.existsSync(romPath)) {
    await fileInput.setInputFiles(romPath)
    // Wait a bit for the emulator loop to render
    await page.waitForTimeout(2000)
    const canvas = await page.$('#screen')
    expect(canvas).not.toBeNull()
    const screenshot = await canvas.screenshot()
    expect(screenshot.length).toBeGreaterThan(0)
  } else {
    test.skip(true, 'No sample ROM available in tests/roms/sample.gb')
  }
})
