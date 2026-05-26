// integration tests for the bff — mocks the orchestrator service binding

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
		expect(orchestrator.fetch).toHaveBeenCalledWith('https://orchestrator/case/abc')
	})

	it('forwards approval', async () => {
		const orchestrator = mockOrchestrator({ ok: true })
		await app.request('/api/cases/abc/approve', { method: 'POST' }, { ORCHESTRATOR: orchestrator })
		const call = orchestrator.fetch.mock.calls[0]
		expect(call[0]).toBe('https://orchestrator/case/abc/approve')
		expect(call[1].method).toBe('POST')
	})
})
