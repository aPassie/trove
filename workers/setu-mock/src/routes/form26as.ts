// returns a fixture 26as for the demo persona, shape mirrors setu's documented response

import { Context } from 'hono'

const AAKASH_26AS = {
	pan: 'ZZZZZ9999Z',
	assessmentYear: '2025-26',
	taxpayerName: 'Aakash Singh',
	tdsEntries: [
		{ deductor: 'Acme Design Studio Pvt Ltd', tan: 'BLRA12345E', section: '194J', amount: 6600, financialYear: '2024-25' },
		{ deductor: 'Brightline Media Pvt Ltd', tan: 'MUMB67890F', section: '194J', amount: 8400, financialYear: '2024-25' },
		{ deductor: 'Quartz Labs', tan: 'DELQ54321A', section: '194C', amount: 10200, financialYear: '2024-25' },
		{ deductor: 'Northwind Studios', tan: 'BLRN98765K', section: '194J', amount: 12000, financialYear: '2024-25' },
		{ deductor: 'Beacon Analytics', tan: 'PUNB11122M', section: '194J', amount: 13800, financialYear: '2024-25' }
	],
	totalTdsDeducted: 51000,
	refundableEstimate: 51000
}

export async function getForm26AS(c: Context): Promise<Response> {
	const userId = c.req.query('userId')
	if (userId === 'demo-aakash') {
		return c.json(AAKASH_26AS)
	}
	return c.json({ error: 'no 26as on file' }, 404)
}
