import type { CaseState } from './durable-objects/case-state'
import { isInternalRequestAuthorized } from './auth'

export { CaseWorkflow } from './workflows/case'
export { CaseState } from './durable-objects/case-state'

type Env = {
	CASE_WORKFLOW: Workflow
	CASE_STATE: DurableObjectNamespace<CaseState>
	INTERNAL_API_TOKEN?: string
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url)

		if (!isInternalRequestAuthorized(req, env.INTERNAL_API_TOKEN)) {
			return new Response('unauthorized', { status: 401 })
		}

		if (req.method === 'POST' && url.pathname === '/case') {
			const body = (await req.json()) as { ownerId?: string; profileId?: string }
			const ownerId = typeof body.ownerId === 'string' ? body.ownerId : ''
			const profileId = typeof body.profileId === 'string' ? body.profileId : ''
			if (!ownerId || !profileId) {
				return new Response('bad request', { status: 400 })
			}
			const instance = await env.CASE_WORKFLOW.create({ params: { ownerId, profileId } })
			const stub = env.CASE_STATE.get(env.CASE_STATE.idFromName(instance.id))
			await stub.setOwner(ownerId)
			await stub.setCaseId(instance.id)
			return Response.json({ caseId: instance.id })
		}

		const approve = url.pathname.match(/^\/case\/([^/]+)\/approve$/)
		if (approve && req.method === 'POST') {
			const [, caseId] = approve
			const stub = env.CASE_STATE.get(env.CASE_STATE.idFromName(caseId))
			const denied = await ownershipDenial(stub, req)
			if (denied) return denied
			const instance = await env.CASE_WORKFLOW.get(caseId)
			await instance.sendEvent({ type: 'approved', payload: { type: 'approved' } })
			return Response.json({ ok: true })
		}

		const match = url.pathname.match(/^\/case\/([^/]+)$/)
		if (match && req.method === 'GET') {
			const [, caseId] = match
			const stub = env.CASE_STATE.get(env.CASE_STATE.idFromName(caseId))
			const denied = await ownershipDenial(stub, req)
			if (denied) return denied
			return Response.json(await stub.getPublicState())
		}

		return new Response('not found', { status: 404 })
	}
}

async function ownershipDenial(stub: DurableObjectStub<CaseState>, req: Request): Promise<Response | null> {
	const owner = await stub.getOwner()
	if (!owner) return new Response('not found', { status: 404 })
	const requester = req.headers.get('x-trove-user')
	if (!requester || requester !== owner) return new Response('forbidden', { status: 403 })
	return null
}
