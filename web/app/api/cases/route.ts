import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/case-ownership'
import { setCaseOwner } from '@/lib/case-ownership'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const clientIp = getClientIp(req)
  if (!checkRateLimit(`create-case:${clientIp}`, 10)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  }

  if (req.headers.get('origin')) {
    const allowed = process.env.AUTH_URL || 'http://localhost:3000'
    if (req.headers.get('origin') !== allowed) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  let userId: string
  try {
    userId = await getSessionUserId()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let mockUserId: string | undefined
  try {
    const body = await req.json().catch(() => null)
    if (body && typeof body === 'object' && 'mockUserId' in body && typeof body.mockUserId === 'string') {
      mockUserId = body.mockUserId
    }
  } catch {
    // ignore parse errors
  }

  const bffUrl = process.env.BFF_URL || 'http://localhost:8789'

  try {
    const res = await fetch(`${bffUrl}/api/cases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: mockUserId || userId })
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'failed to create case' }, { status: 502 })
    }

    const data = await res.json() as { caseId: string }
    if (!data?.caseId) {
      return NextResponse.json({ error: 'invalid response from upstream' }, { status: 502 })
    }

    setCaseOwner(data.caseId, userId)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
