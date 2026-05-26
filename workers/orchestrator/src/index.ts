// orchestrator entry — exports the workflow and durable object, routes http to them

import type { CaseState } from './durable-objects/case-state'

export { CaseWorkflow } from './workflows/case'
export { CaseState } from './durable-objects/case-state'

type Env = {
	CASE_WORKFLOW: Workflow
	CASE_STATE: DurableObjectNamespace<CaseState>
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url)

		if (req.method === 'POST' && url.pathname === '/case') {
			const body = (await req.json()) as { userId: string }
			const instance = await env.CASE_WORKFLOW.create({ params: { userId: body.userId } })
			return Response.json({ caseId: instance.id })
		}

		const approve = url.pathname.match(/^\/case\/([^/]+)\/approve$/)
		if (approve && req.method === 'POST') {
			const [, caseId] = approve
			const instance = await env.CASE_WORKFLOW.get(caseId)
			await instance.sendEvent({ type: 'user-approval', payload: { type: 'approved' } })
			return Response.json({ ok: true })
		}

		const match = url.pathname.match(/^\/case\/([^/]+)$/)
		if (match) {
			const [, caseId] = match
			const id = env.CASE_STATE.idFromName(caseId)
			return env.CASE_STATE.get(id).fetch(req)
		}

		return new Response('not found', { status: 404 })
	}
}
