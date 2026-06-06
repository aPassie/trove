let warned = false

function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false
	let diff = 0
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
	}
	return diff === 0
}

export function isInternalRequestAuthorized(req: Request, token: string | undefined): boolean {
	if (!token) {
		if (!warned) {
			console.warn('INTERNAL_API_TOKEN is not set — setu-mock hop is UNAUTHENTICATED (dev only)')
			warned = true
		}
		return true
	}
	const header = req.headers.get('authorization') || ''
	return constantTimeEqual(header, `Bearer ${token}`)
}
