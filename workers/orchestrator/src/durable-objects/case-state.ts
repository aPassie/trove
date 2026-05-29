// per-case durable object — step timeline, analysis, and final draft, fetched as json

import { DurableObject } from 'cloudflare:workers'
import { mergeStep, type CaseStep } from './merge-step'

export type { CaseStep } from './merge-step'

type Env = Record<string, unknown>

type State = {
	caseId: string
	steps: CaseStep[]
	analysis?: object
	draft?: object
}

export class CaseState extends DurableObject<Env> {
	private async readState(caseId = ''): Promise<State> {
		return (await this.ctx.storage.get<State>('state')) ?? { caseId, steps: [] }
	}

	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url)
		const state = await this.readState(url.pathname.split('/').pop() ?? '')
		return Response.json(state)
	}

	async setCaseId(caseId: string): Promise<void> {
		const state = await this.readState(caseId)
		state.caseId = caseId
		await this.ctx.storage.put('state', state)
	}

	async updateStep(step: CaseStep): Promise<void> {
		const state = await this.readState()
		state.steps = mergeStep(state.steps, step)
		await this.ctx.storage.put('state', state)
	}

	async setAnalysis(analysis: object): Promise<void> {
		const state = await this.readState()
		state.analysis = analysis
		await this.ctx.storage.put('state', state)
	}

	async setDraft(draft: object): Promise<void> {
		const state = await this.readState()
		state.draft = draft
		await this.ctx.storage.put('state', state)
	}
}
