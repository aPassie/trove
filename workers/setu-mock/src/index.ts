import { Hono } from 'hono'
import { getForm26AS } from './routes/form26as'
import { looksLikeRealPII } from './guard'
import { isInternalRequestAuthorized } from './auth'

type Bindings = { INTERNAL_API_TOKEN?: string }

const app = new Hono<{ Bindings: Bindings }>()

app.get('/health', (c) => c.json({ ok: true }))

app.use('/form26as', async (c, next) => {
	if (!isInternalRequestAuthorized(c.req.raw, c.env?.INTERNAL_API_TOKEN)) {
		return c.json({ error: 'unauthorized' }, 401)
	}
	const body = c.req.method === 'GET' ? '' : await c.req.text().catch(() => '')
	if (looksLikeRealPII(c.req.url) || (body && looksLikeRealPII(body))) {
		return c.json({ error: 'real pii rejected' }, 422)
	}
	await next()
})

app.get('/form26as', getForm26AS)

export default app
