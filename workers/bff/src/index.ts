// edge bff — fans case requests out to the orchestrator service

import { Hono } from 'hono'

type Bindings = {
	ORCHESTRATOR: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/health', (c) => c.json({ ok: true }))

app.post('/api/cases', async (c) => {
	const body = await c.req.json()
	return c.env.ORCHESTRATOR.fetch('https://orchestrator/case', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'content-type': 'application/json' }
	})
})

app.get('/api/cases/:id', async (c) => {
	const id = c.req.param('id')
	return c.env.ORCHESTRATOR.fetch(`https://orchestrator/case/${id}`)
})

app.post('/api/cases/:id/approve', async (c) => {
	const id = c.req.param('id')
	return c.env.ORCHESTRATOR.fetch(`https://orchestrator/case/${id}/approve`, { method: 'POST' })
})

export default app
