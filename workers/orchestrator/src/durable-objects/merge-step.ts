// merge-step — pure helper extracted for testing, also keeps case-state import-light

export type CaseStep = {
	name: string
	status: 'pending' | 'running' | 'done' | 'awaiting-approval' | 'failed'
	startedAt?: number
	finishedAt?: number
}

export function mergeStep(steps: CaseStep[], step: CaseStep): CaseStep[] {
	const idx = steps.findIndex((s) => s.name === step.name)
	if (idx >= 0) {
		const next = steps.slice()
		next[idx] = step
		return next
	}
	return [...steps, step]
}
