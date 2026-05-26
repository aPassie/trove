// unit tests for the case-state merge logic — the durable object class itself needs miniflare,
// but the merge logic is a pure function and that's where the actual dedup correctness lives.

import { describe, it, expect } from 'vitest'
import { mergeStep, type CaseStep } from '../src/durable-objects/merge-step'

describe('mergeStep', () => {
	it('appends when no step with the same name exists', () => {
		const steps: CaseStep[] = [{ name: 'pull-26as', status: 'done' }]
		const out = mergeStep(steps, { name: 'parse', status: 'running' })
		expect(out).toHaveLength(2)
		expect(out[1].name).toBe('parse')
	})

	it('replaces in place when name matches (running → done is one row, not two)', () => {
		const steps: CaseStep[] = [{ name: 'pull-26as', status: 'running', startedAt: 1 }]
		const out = mergeStep(steps, { name: 'pull-26as', status: 'done', startedAt: 1, finishedAt: 5 })
		expect(out).toHaveLength(1)
		expect(out[0].status).toBe('done')
		expect(out[0].finishedAt).toBe(5)
	})

	it('does not mutate the input array', () => {
		const steps: CaseStep[] = [{ name: 'a', status: 'running' }]
		mergeStep(steps, { name: 'a', status: 'done' })
		expect(steps[0].status).toBe('running')
	})

	it('keeps order — newer steps go to the end', () => {
		const steps: CaseStep[] = [
			{ name: 'pull-26as', status: 'done' },
			{ name: 'parse', status: 'done' }
		]
		const out = mergeStep(steps, { name: 'analyse', status: 'running' })
		expect(out.map((s) => s.name)).toEqual(['pull-26as', 'parse', 'analyse'])
	})
})
