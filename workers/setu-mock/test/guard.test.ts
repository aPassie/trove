// unit test for the pii guard — confirms real pan and aadhaar shapes are rejected, fixture shapes pass

import { describe, it, expect } from 'vitest'
import { looksLikeRealPII } from '../src/guard'

describe('looksLikeRealPII', () => {
	it('rejects a real-looking pan', () => {
		expect(looksLikeRealPII('user pan is ABCDE1234F')).toBe(true)
	})

	it('allows the documentation-safe fixture pan', () => {
		expect(looksLikeRealPII('pan is ZZZZZ9999Z')).toBe(false)
	})

	it('rejects a real-looking aadhaar number', () => {
		expect(looksLikeRealPII('aadhaar 123456789012')).toBe(true)
	})

	it('allows the documentation-safe aadhaar prefix', () => {
		expect(looksLikeRealPII('aadhaar 999900001234')).toBe(false)
	})
})
