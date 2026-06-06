import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import type { CaseState, CaseStep } from '../durable-objects/case-state'

type Params = { ownerId: string; profileId: string }

type Env = {
	SETU_URL: string
	BACKEND_URL: string
	CASE_STATE: DurableObjectNamespace<CaseState>
	INTERNAL_API_TOKEN?: string
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
		const { ownerId, profileId } = event.payload
		const stub = this.env.CASE_STATE.get(this.env.CASE_STATE.idFromName(event.instanceId))
		await stub.setOwner(ownerId)
		await stub.setCaseId(event.instanceId)

		const authHeaders = (extra?: Record<string, string>): Record<string, string> => {
			const headers: Record<string, string> = { ...(extra ?? {}) }
			if (this.env.INTERNAL_API_TOKEN) headers['authorization'] = `Bearer ${this.env.INTERNAL_API_TOKEN}`
			return headers
		}

		const update = (s: CaseStep) => stub.updateStep(s)
		const fail = async (name: string, err: unknown) => {
			const message = err instanceof Error ? err.message : 'unknown workflow error'
			await update({ name, status: 'failed', finishedAt: Date.now(), error: message })
		}
		const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
			const res = await fetch(url, { ...init, headers: authHeaders(init?.headers as Record<string, string> | undefined) })
			if (!res.ok) {
				throw new Error(`upstream ${res.status} from ${new URL(url).pathname}`)
			}
			return (await res.json()) as T
		}

		const form26as = await step.do<Form26AS>('pull-26as', async () => {
			await update({ name: 'pull-26as', status: 'running', startedAt: Date.now() })
			await new Promise(resolve => setTimeout(resolve, 1800))
			try {
				const data = await fetchJson<Form26AS>(`${this.env.SETU_URL}/form26as?userId=${encodeURIComponent(profileId)}`)
				await update({ name: 'pull-26as', status: 'done', finishedAt: Date.now() })
				return data
			} catch (err) {
				await fail('pull-26as', err)
				throw err
			}
		})

		const parsed = await step.do<Form26AS>('parse', async () => {
			await update({ name: 'parse', status: 'running', startedAt: Date.now() })
			await new Promise(resolve => setTimeout(resolve, 1500))
			try {
				const data = await fetchJson<Form26AS>(`${this.env.BACKEND_URL}/parse/26as`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(form26as)
				})
				await update({ name: 'parse', status: 'done', finishedAt: Date.now() })
				return data
			} catch (err) {
				await fail('parse', err)
				throw err
			}
		})

		const analysis = await step.do<Analysis>('analyse', async () => {
			await update({ name: 'analyse', status: 'running', startedAt: Date.now() })
			await new Promise(resolve => setTimeout(resolve, 2200))
			try {
				const data = await fetchJson<Analysis>(`${this.env.BACKEND_URL}/agent/analyse`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(parsed)
				})
				await stub.setAnalysis(data)
				await update({ name: 'analyse', status: 'done', finishedAt: Date.now() })
				return data
			} catch (err) {
				await fail('analyse', err)
				throw err
			}
		})

		await update({ name: 'awaiting-approval', status: 'awaiting-approval' })
		await step.waitForEvent('user-approval', { type: 'approved', timeout: '7 days' })
		await update({ name: 'awaiting-approval', status: 'done', finishedAt: Date.now() })

		const draft = await step.do<Draft>('draft-itr1', async () => {
			await update({ name: 'draft-itr1', status: 'running', startedAt: Date.now() })
			await new Promise(resolve => setTimeout(resolve, 1600))
			try {
				const data = await fetchJson<Draft>(`${this.env.BACKEND_URL}/itr/draft`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(analysis)
				})
				await update({ name: 'draft-itr1', status: 'done', finishedAt: Date.now() })
				return data
			} catch (err) {
				await fail('draft-itr1', err)
				throw err
			}
		})

		await stub.setDraft(draft)
		return { caseId: event.instanceId, draft }
	}
}
