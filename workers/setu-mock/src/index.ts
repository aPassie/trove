// fake setu api over real https for local development

import { Hono } from 'hono'
import { getForm26AS } from './routes/form26as'

const app = new Hono()

app.get('/health', (c) => c.json({ ok: true }))
app.get('/form26as', getForm26AS)

export default app
