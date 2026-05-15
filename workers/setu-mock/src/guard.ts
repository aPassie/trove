// guard — refuses requests that contain real-looking pan or aadhaar values

const REAL_PAN = /[A-PR-WYZ][A-PR-WYZ][A-PR-WYZ][A-PR-WYZ][A-PR-WYZ][0-9]{4}[A-PR-WYZ]/
const FAKE_PAN_PREFIX = /^ZZZZZ/
const REAL_AADHAAR = /\b\d{12}\b/
const FAKE_AADHAAR_PREFIX = /^9999/

export function looksLikeRealPII(blob: string): boolean {
	const pan = blob.match(REAL_PAN)
	if (pan && !FAKE_PAN_PREFIX.test(pan[0])) return true

	const aadhaar = blob.match(REAL_AADHAAR)
	if (aadhaar && !FAKE_AADHAAR_PREFIX.test(aadhaar[0])) return true

	return false
}
