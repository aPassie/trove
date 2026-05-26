// integration tests for the hono app — uses app.request, no miniflare needed

import { describe, it, expect } from 'vitest'
import app from '../src'

describe('setu-mock', () => {
	it('reports healthy', async () => {
		const res = await app.request('/health')
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ ok: true })
	})

	it('serves aakash 26as for the demo persona', async () => {
		const res = await app.request('/form26as?userId=demo-aakash')
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			pan: string
			totalTdsDeducted: number
			tdsEntries: unknown[]
		}
		expect(body.pan).toBe('ZZZZZ9999Z')
		expect(body.totalTdsDeducted).toBe(51000)
		expect(body.tdsEntries.length).toBe(5)
	})

	it('returns 404 for unknown user', async () => {
		const res = await app.request('/form26as?userId=someone-else')
		expect(res.status).toBe(404)
	})

	it('returns 404 when userId missing', async () => {
		const res = await app.request('/form26as')
		expect(res.status).toBe(404)
	})
})
