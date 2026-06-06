import { describe, it, expect, vi } from 'vitest'
import app from '../src'

function mockOrchestrator(payload: unknown) {
	return {
		fetch: vi.fn().mockResolvedValue(
			new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
		)
	}
}

describe('bff', () => {
	it('reports healthy', async () => {
		const res = await app.request('/health')
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ ok: true })
	})

	it('forwards new case requests to the orchestrator', async () => {
		const orchestrator = mockOrchestrator({ caseId: 'abc' })
		const res = await app.request(
			'/api/cases',
			{ method: 'POST', body: JSON.stringify({ userId: 'demo-aakash' }) },
			{ ORCHESTRATOR: orchestrator }
		)
		expect(res.status).toBe(200)
		const call = orchestrator.fetch.mock.calls[0]
		expect(call[0]).toBe('https://orchestrator/case')
		expect(call[1].method).toBe('POST')
	})

	it('forwards case lookups by id', async () => {
		const orchestrator = mockOrchestrator({ caseId: 'abc', steps: [] })
		await app.request('/api/cases/abc', {}, { ORCHESTRATOR: orchestrator })
		expect(orchestrator.fetch.mock.calls[0][0]).toBe('https://orchestrator/case/abc')
	})

	it('forwards approval', async () => {
		const orchestrator = mockOrchestrator({ ok: true })
		await app.request('/api/cases/abc/approve', { method: 'POST' }, { ORCHESTRATOR: orchestrator })
		const call = orchestrator.fetch.mock.calls[0]
		expect(call[0]).toBe('https://orchestrator/case/abc/approve')
		expect(call[1].method).toBe('POST')
	})

	it('propagates the caller identity to the orchestrator', async () => {
		const orchestrator = mockOrchestrator({ caseId: 'abc', steps: [] })
		await app.request('/api/cases/abc', { headers: { 'x-trove-user': 'demo-123' } }, { ORCHESTRATOR: orchestrator })
		const call = orchestrator.fetch.mock.calls[0]
		expect(call[1].headers['x-trove-user']).toBe('demo-123')
	})

	it('rejects /api requests without the internal token when one is configured', async () => {
		const orchestrator = mockOrchestrator({ caseId: 'abc' })
		const res = await app.request(
			'/api/cases/abc',
			{},
			{ ORCHESTRATOR: orchestrator, INTERNAL_API_TOKEN: 'sekret' }
		)
		expect(res.status).toBe(401)
		expect(orchestrator.fetch).not.toHaveBeenCalled()
	})

	it('accepts /api requests bearing the correct internal token', async () => {
		const orchestrator = mockOrchestrator({ caseId: 'abc', steps: [] })
		const res = await app.request(
			'/api/cases/abc',
			{ headers: { authorization: 'Bearer sekret' } },
			{ ORCHESTRATOR: orchestrator, INTERNAL_API_TOKEN: 'sekret' }
		)
		expect(res.status).toBe(200)
		expect(orchestrator.fetch.mock.calls[0][1].headers['authorization']).toBe('Bearer sekret')
	})

	it('rejects create when the rate limiter is exhausted', async () => {
		const orchestrator = mockOrchestrator({ caseId: 'abc' })
		const limiter = { limit: vi.fn().mockResolvedValue({ success: false }) }
		const res = await app.request(
			'/api/cases',
			{ method: 'POST', body: JSON.stringify({ ownerId: 'u1', profileId: 'demo-aakash' }) },
			{ ORCHESTRATOR: orchestrator, RATE_LIMITER: limiter }
		)
		expect(res.status).toBe(429)
		expect(orchestrator.fetch).not.toHaveBeenCalled()
		expect(limiter.limit).toHaveBeenCalledWith({ key: expect.stringMatching(/^create:/) })
	})

	it('allows create when under the rate limit', async () => {
		const orchestrator = mockOrchestrator({ caseId: 'abc' })
		const limiter = { limit: vi.fn().mockResolvedValue({ success: true }) }
		const res = await app.request(
			'/api/cases',
			{ method: 'POST', body: JSON.stringify({ ownerId: 'u1', profileId: 'demo-aakash' }) },
			{ ORCHESTRATOR: orchestrator, RATE_LIMITER: limiter }
		)
		expect(res.status).toBe(200)
		expect(orchestrator.fetch).toHaveBeenCalled()
	})

	it('rate-limits the approve path under its own key', async () => {
		const orchestrator = mockOrchestrator({ ok: true })
		const limiter = { limit: vi.fn().mockResolvedValue({ success: false }) }
		const res = await app.request(
			'/api/cases/abc/approve',
			{ method: 'POST' },
			{ ORCHESTRATOR: orchestrator, RATE_LIMITER: limiter }
		)
		expect(res.status).toBe(429)
		expect(orchestrator.fetch).not.toHaveBeenCalled()
		expect(limiter.limit).toHaveBeenCalledWith({ key: expect.stringMatching(/^approve:/) })
	})
})
