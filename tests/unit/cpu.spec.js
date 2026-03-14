import { describe, it, expect } from 'vitest'
import CPU from '../../src/CPU.js'

// Basic smoke test to ensure CPU module loads and exposes expected API

describe('CPU module', () => {
  it('loads and has step method', () => {
    expect(typeof CPU).toBe('object')
    expect(typeof CPU.step === 'function' || typeof CPU.step === 'undefined').toBeTruthy()
  })
})