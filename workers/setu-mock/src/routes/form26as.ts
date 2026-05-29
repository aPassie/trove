// returns a fixture 26as for the demo persona, shape mirrors setu's documented response

import { Context } from 'hono'

const MOCK_PROFILES: Record<string, any> = {
	'demo-aakash': {
		pan: 'AAKAS9999Z',
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
	},
	'demo-priya': {
		pan: 'PRIYA8888Y',
		assessmentYear: '2025-26',
		taxpayerName: 'Priya Sharma',
		tdsEntries: [
			{ deductor: 'DesignCraft Hub', tan: 'BLRD99887C', section: '194J', amount: 9500, financialYear: '2024-25' },
			{ deductor: 'Aura Marketing', tan: 'DELA66554B', section: '194J', amount: 7200, financialYear: '2024-25' },
			{ deductor: 'PixelPerfect Solutions', tan: 'MUMP33221D', section: '194J', amount: 11800, financialYear: '2024-25' },
			{ deductor: 'Nova Agency', tan: 'PUNN77889A', section: '194J', amount: 10000, financialYear: '2024-25' }
		],
		totalTdsDeducted: 38500,
		refundableEstimate: 38500
	},
	'demo-rohan': {
		pan: 'ROHAN7777X',
		assessmentYear: '2025-26',
		taxpayerName: 'Rohan Mehta',
		tdsEntries: [
			{ deductor: 'StackDev Technologies', tan: 'MUMS11223F', section: '194J', amount: 14000, financialYear: '2024-25' },
			{ deductor: 'Quantum Systems', tan: 'BLRQ44556G', section: '194J', amount: 12500, financialYear: '2024-25' },
			{ deductor: 'Apex Logistics', tan: 'DELA77889H', section: '194C', amount: 15200, financialYear: '2024-25' },
			{ deductor: 'Vortex Global', tan: 'PUNV33445K', section: '194J', amount: 11000, financialYear: '2024-25' },
			{ deductor: 'Skyline Corp', tan: 'BLRS99001L', section: '194C', amount: 9500, financialYear: '2024-25' },
			{ deductor: 'Stellar Tech', tan: 'MUMS22334M', section: '194J', amount: 12000, financialYear: '2024-25' }
		],
		totalTdsDeducted: 74200,
		refundableEstimate: 74200
	},
	'demo-neha': {
		pan: 'NEHAP6666W',
		assessmentYear: '2025-26',
		taxpayerName: 'Neha Patel',
		tdsEntries: [
			{ deductor: 'WordSmith Content', tan: 'DELW55443P', section: '194J', amount: 6800, financialYear: '2024-25' },
			{ deductor: 'BlueSky Digital', tan: 'BLRB22334Q', section: '194J', amount: 8200, financialYear: '2024-25' },
			{ deductor: 'Echo PR Agency', tan: 'MUME99887R', section: '194J', amount: 6600, financialYear: '2024-25' }
		],
		totalTdsDeducted: 21600,
		refundableEstimate: 21600
	},
	'demo-karan': {
		pan: 'KARAN5555V',
		assessmentYear: '2025-26',
		taxpayerName: 'Karan Malhotra',
		tdsEntries: [
			{ deductor: 'FrameDrop Studios', tan: 'MUMF99001D', section: '194J', amount: 13500, financialYear: '2024-25' },
			{ deductor: 'Vivid Render Labs', tan: 'BLRV44556C', section: '194J', amount: 11200, financialYear: '2024-25' },
			{ deductor: 'Animate Media Group', tan: 'DELA77889F', section: '194C', amount: 14500, financialYear: '2024-25' },
			{ deductor: 'MotionCraft Corp', tan: 'PUNM22334K', section: '194J', amount: 10800, financialYear: '2024-25' },
			{ deductor: 'CineStudio', tan: 'BLRC88990M', section: '194J', amount: 12000, financialYear: '2024-25' }
		],
		totalTdsDeducted: 62000,
		refundableEstimate: 62000
	},
	'demo-ananya': {
		pan: 'ANANY4444U',
		assessmentYear: '2025-26',
		taxpayerName: 'Ananya Iyer',
		tdsEntries: [
			{ deductor: 'DataInsights Labs', tan: 'BLRD11223A', section: '194J', amount: 15500, financialYear: '2024-25' },
			{ deductor: 'BrainTree AI', tan: 'MUMB44556B', section: '194J', amount: 14800, financialYear: '2024-25' },
			{ deductor: 'Neural Analytics', tan: 'DELN77889C', section: '194J', amount: 16200, financialYear: '2024-25' },
			{ deductor: 'DeepScan Tech', tan: 'PUND33445D', section: '194J', amount: 13000, financialYear: '2024-25' },
			{ deductor: 'HyperCube Inc', tan: 'BLRH99001E', section: '194J', amount: 11500, financialYear: '2024-25' },
			{ deductor: 'DataCore Solutions', tan: 'MUMD22334F', section: '194J', amount: 12000, financialYear: '2024-25' },
			{ deductor: 'ModelLabs AI', tan: 'PUNM66778G', section: '194J', amount: 12000, financialYear: '2024-25' }
		],
		totalTdsDeducted: 95000,
		refundableEstimate: 95000
	},
	'demo-vikram': {
		pan: 'VIKRA3333T',
		assessmentYear: '2025-26',
		taxpayerName: 'Vikram Sen',
		tdsEntries: [
			{ deductor: 'Acoustic Studios Pvt Ltd', tan: 'DELA99001K', section: '194C', amount: 7800, financialYear: '2024-25' },
			{ deductor: 'SoundWave Media', tan: 'BLRS44556L', section: '194C', amount: 7600, financialYear: '2024-25' }
		],
		totalTdsDeducted: 15400,
		refundableEstimate: 15400
	},
	'demo-tanvi': {
		pan: 'TANVI2222S',
		assessmentYear: '2025-26',
		taxpayerName: 'Tanvi Rao',
		tdsEntries: [
			{ deductor: 'BrandElevate', tan: 'BLRB11223F', section: '194J', amount: 11000, financialYear: '2024-25' },
			{ deductor: 'Identity Group', tan: 'MUMI44556G', section: '194C', amount: 13500, financialYear: '2024-25' },
			{ deductor: 'Core Consulting', tan: 'DELC77889H', section: '194J', amount: 12000, financialYear: '2024-25' },
			{ deductor: 'Strategic Media', tan: 'PUNS33445K', section: '194J', amount: 11500, financialYear: '2024-25' }
		],
		totalTdsDeducted: 48000,
		refundableEstimate: 48000
	},
	'demo-kabir': {
		pan: 'KABIR1111R',
		assessmentYear: '2025-26',
		taxpayerName: 'Kabir Verma',
		tdsEntries: [
			{ deductor: 'CutPaste Productions', tan: 'MUMC99001D', section: '194J', amount: 11500, financialYear: '2024-25' },
			{ deductor: 'Splice VFX Labs', tan: 'BLRS44556C', section: '194J', amount: 10800, financialYear: '2024-25' },
			{ deductor: 'Prime cut Studios', tan: 'DELP77889F', section: '194J', amount: 11500, financialYear: '2024-25' }
		],
		totalTdsDeducted: 33800,
		refundableEstimate: 33800
	},
	'demo-meera': {
		pan: 'MEERA0000Q',
		assessmentYear: '2025-26',
		taxpayerName: 'Meera Deshmukh',
		tdsEntries: [
			{ deductor: 'CloudScale Consulting', tan: 'BLRC11223P', section: '194J', amount: 16500, financialYear: '2024-25' },
			{ deductor: 'Architects of Code', tan: 'MUMA44556Q', section: '194J', amount: 15200, financialYear: '2024-25' },
			{ deductor: 'Enterprise Systems', tan: 'DELE77889R', section: '194C', amount: 14800, financialYear: '2024-25' },
			{ deductor: 'NextGen Infra', tan: 'PUNN33445S', section: '194J', amount: 13500, financialYear: '2024-25' },
			{ deductor: 'Apex Blueprints', tan: 'BLRA99001T', section: '194J', amount: 12500, financialYear: '2024-25' },
			{ deductor: 'DevOps Scale Corp', tan: 'MUMD22334U', section: '194J', amount: 13000, financialYear: '2024-25' },
			{ deductor: 'Solid Foundations', tan: 'PUNS66778V', section: '194C', amount: 12500, financialYear: '2024-25' },
			{ deductor: 'Platform Engineering', tan: 'BLRP33445W', section: '194J', amount: 14000, financialYear: '2024-25' }
		],
		totalTdsDeducted: 112000,
		refundableEstimate: 112000
	}
}

export async function getForm26AS(c: Context): Promise<Response> {
	const userId = c.req.query('userId') || ''
	const profile = MOCK_PROFILES[userId] || MOCK_PROFILES['demo-aakash']
	return c.json(profile)
}
