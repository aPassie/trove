import { DurableObject } from 'cloudflare:workers'
import { mergeStep, type CaseStep } from './merge-step'

export type { CaseStep } from './merge-step'

type Env = Record<string, unknown>

type State = {
	caseId: string
	ownerId?: string
	steps: CaseStep[]
	analysis?: object
	draft?: object
}

export type PublicState = Omit<State, 'ownerId'>

export class CaseState extends DurableObject<Env> {
	private async readState(caseId = ''): Promise<State> {
		return (await this.ctx.storage.get<State>('state')) ?? { caseId, steps: [] }
	}

	async getPublicState(): Promise<PublicState> {
		const { ownerId: _ownerId, ...rest } = await this.readState()
		return rest
	}

	async setOwner(ownerId: string): Promise<void> {
		const state = await this.readState()
		if (!state.ownerId) {
			state.ownerId = ownerId
			await this.ctx.storage.put('state', state)
		}
	}

	async getOwner(): Promise<string | null> {
		return (await this.readState()).ownerId ?? null
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
