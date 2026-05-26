// case workflow — pull, parse, analyse, pause for approval, then draft. updates the per-case state at every step.

import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import type { CaseState, CaseStep } from '../durable-objects/case-state'

type Params = { userId: string }

type Env = {
	SETU_URL: string
	BACKEND_URL: string
	CASE_STATE: DurableObjectNamespace<CaseState>
}

type TDSEntry = {
	deductor: string
	tan?: string
	section: string
	amount: number
	financialYear: string
}

type Form26AS = {
	pan: string
	assessmentYear: string
	taxpayerName: string
	tdsEntries: TDSEntry[]
	totalTdsDeducted: number
	refundableEstimate: number
}

type Analysis = Form26AS & {
	refundEstimate: number
	summary: string
}

type Draft = {
	schema: string
	itr1: { [k: string]: string | number | TDSEntry[] | { [k: string]: number } }
	refundAmount: number
}

export class CaseWorkflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const { userId } = event.payload
		const stub = this.env.CASE_STATE.get(this.env.CASE_STATE.idFromName(event.instanceId))

		const update = (s: CaseStep) => stub.updateStep(s)

		const form26as = await step.do<Form26AS>('pull-26as', async () => {
			await update({ name: 'pull-26as', status: 'running', startedAt: Date.now() })
			const res = await fetch(`${this.env.SETU_URL}/form26as?userId=${userId}`)
			const data = (await res.json()) as Form26AS
			await update({ name: 'pull-26as', status: 'done', finishedAt: Date.now() })
			return data
		})

		const parsed = await step.do<Form26AS>('parse', async () => {
			await update({ name: 'parse', status: 'running', startedAt: Date.now() })
			const res = await fetch(`${this.env.BACKEND_URL}/parse/26as`, {
				method: 'POST',
				body: JSON.stringify(form26as)
			})
			const data = (await res.json()) as Form26AS
			await update({ name: 'parse', status: 'done', finishedAt: Date.now() })
			return data
		})

		const analysis = await step.do<Analysis>('analyse', async () => {
			await update({ name: 'analyse', status: 'running', startedAt: Date.now() })
			const res = await fetch(`${this.env.BACKEND_URL}/agent/analyse`, {
				method: 'POST',
				body: JSON.stringify(parsed)
			})
			const data = (await res.json()) as Analysis
			await update({ name: 'analyse', status: 'done', finishedAt: Date.now() })
			return data
		})

		await update({ name: 'awaiting-approval', status: 'awaiting-approval' })
		await step.waitForEvent('user-approval', { type: 'approved', timeout: '7 days' })

		const draft = await step.do<Draft>('draft-itr1', async () => {
			await update({ name: 'draft-itr1', status: 'running', startedAt: Date.now() })
			const res = await fetch(`${this.env.BACKEND_URL}/itr/draft`, {
				method: 'POST',
				body: JSON.stringify(analysis)
			})
			const data = (await res.json()) as Draft
			await update({ name: 'draft-itr1', status: 'done', finishedAt: Date.now() })
			return data
		})

		await stub.setDraft(draft)
		return { caseId: event.instanceId, draft }
	}
}
