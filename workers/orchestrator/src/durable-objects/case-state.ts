// per-case durable object — holds the step timeline, fetched as json by the browser

import { DurableObject } from 'cloudflare:workers'

type Env = Record<string, unknown>

export type CaseStep = {
	name: string
	status: 'pending' | 'running' | 'done' | 'awaiting-approval' | 'failed'
	startedAt?: number
	finishedAt?: number
}

type State = {
	caseId: string
	steps: CaseStep[]
}

export class CaseState extends DurableObject<Env> {
	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url)
		const state = (await this.ctx.storage.get<State>('state')) ?? {
			caseId: url.pathname.split('/').pop() ?? '',
			steps: []
		}
		return Response.json(state)
	}

	async updateStep(step: CaseStep): Promise<void> {
		const state = (await this.ctx.storage.get<State>('state')) ?? { caseId: '', steps: [] }
		state.steps.push(step)
		await this.ctx.storage.put('state', state)
	}
}
