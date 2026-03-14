const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

// E2E: serve dist, load the page, inject a ROM file and ensure canvas exists

test('load ROM file and render screen', async ({ page }) => {
  // The CI will serve ./dist at http://localhost:8080
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' })
  await page.waitForSelector('#fileInput', { timeout: 5000 })

  // Ensure file input exists
  const fileInput = await page.$('#fileInput')
  expect(fileInput).not.toBeNull()

  // Find any ROM in tests/roms with common extensions
  const romDir = path.resolve('tests/roms')
  let romPath = null
  if (fs.existsSync(romDir)) {
    const files = fs.readdirSync(romDir).filter((f) => /\.(gb|gbc|bin)$/i.test(f))
    if (files.length > 0) {
      romPath = path.join(romDir, files[0])
      console.log('Using ROM for test:', romPath)
    }
  }

  if (romPath) {
    await fileInput.setInputFiles(romPath)
    // Wait for a short time for the emulator loop to render
    await page.waitForTimeout(3000)
    const canvas = await page.$('#screen')
    expect(canvas).not.toBeNull()
    const screenshot = await canvas.screenshot()
    expect(screenshot.length).toBeGreaterThan(0)
  } else {
    test.skip(true, 'No ROM available in tests/roms')
  }
})
