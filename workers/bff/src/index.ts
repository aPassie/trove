import { Hono } from 'hono'
import { isInternalRequestAuthorized } from './auth'

type RateLimiter = { limit: (opts: { key: string }) => Promise<{ success: boolean }> }

type Bindings = {
	ORCHESTRATOR: Fetcher
	INTERNAL_API_TOKEN?: string
	RATE_LIMITER?: RateLimiter
}

type AppContext = { env: Bindings; req: { header: (k: string) => string | undefined } }

const app = new Hono<{ Bindings: Bindings }>()

app.get('/health', (c) => c.json({ ok: true }))

async function isRateLimited(c: AppContext, action: string): Promise<boolean> {
	const limiter = c.env?.RATE_LIMITER
	if (!limiter) return false
	const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown'
	const { success } = await limiter.limit({ key: `${action}:${ip}` })
	return !success
}

app.use('/api/*', async (c, next) => {
	if (!isInternalRequestAuthorized(c.req.raw, c.env?.INTERNAL_API_TOKEN)) {
		return c.json({ error: 'unauthorized' }, 401)
	}
	await next()
})

function downstreamHeaders(c: { env: Bindings; req: { header: (k: string) => string | undefined } }, extra?: Record<string, string>): Record<string, string> {
	const headers: Record<string, string> = { ...(extra ?? {}) }
	if (c.env?.INTERNAL_API_TOKEN) headers['authorization'] = `Bearer ${c.env.INTERNAL_API_TOKEN}`
	const user = c.req.header('x-trove-user')
	if (user) headers['x-trove-user'] = user
	return headers
}

app.post('/api/cases', async (c) => {
	if (await isRateLimited(c, 'create')) {
		return c.json({ error: 'too many requests' }, 429)
	}
	const body = await c.req.json()
	return c.env.ORCHESTRATOR.fetch('https://orchestrator/case', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: downstreamHeaders(c, { 'content-type': 'application/json' })
	})
})

app.get('/api/cases/:id', async (c) => {
	const id = c.req.param('id')
	return c.env.ORCHESTRATOR.fetch(`https://orchestrator/case/${encodeURIComponent(id)}`, {
		headers: downstreamHeaders(c)
	})
})

app.post('/api/cases/:id/approve', async (c) => {
	if (await isRateLimited(c, 'approve')) {
		return c.json({ error: 'too many requests' }, 429)
	}
	const id = c.req.param('id')
	return c.env.ORCHESTRATOR.fetch(`https://orchestrator/case/${encodeURIComponent(id)}/approve`, {
		method: 'POST',
		headers: downstreamHeaders(c)
	})
})

export default app
