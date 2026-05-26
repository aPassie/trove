// per-case durable object — step timeline plus the final draft, fetched as json

import { DurableObject } from 'cloudflare:workers'
import { mergeStep, type CaseStep } from './merge-step'

export type { CaseStep } from './merge-step'

type Env = Record<string, unknown>

type State = {
	caseId: string
	steps: CaseStep[]
	draft?: object
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
		state.steps = mergeStep(state.steps, step)
		await this.ctx.storage.put('state', state)
	}

	async setDraft(draft: object): Promise<void> {
		const state = (await this.ctx.storage.get<State>('state')) ?? { caseId: '', steps: [] }
		state.draft = draft
		await this.ctx.storage.put('state', state)
	}
}
