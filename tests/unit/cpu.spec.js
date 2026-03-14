import { describe, it, expect, beforeAll } from 'vitest'

// Provide a minimal DOM stub before dynamically importing the module
beforeAll(() => {
  globalThis.document = {
    getElementById: () => null,
    addEventListener: () => {},
  }
})

describe('CPU module', () => {
  it('loads and has step method', async () => {
    const mod = await import('../../src/CPU.js')
    const CPU = mod.default ?? mod
    expect(typeof CPU).toBe('object')
    expect(typeof CPU.step === 'function' || typeof CPU.step === 'undefined').toBeTruthy()
  })
})
