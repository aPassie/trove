import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/case-ownership'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isSameOrigin } from '@/lib/origin'
import { bffUrl, bffHeaders } from '@/lib/internal-api'
import { MOCK_PROFILE_KEYS } from '@/lib/mock-profiles'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const clientIp = getClientIp(req)
  if (!checkRateLimit(`create-case:${clientIp}`, 10)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  }

  let userId: string
  try {
    userId = await getSessionUserId()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let profileId = 'demo-aakash'
  const body = await req.json().catch(() => null)
  if (
    body &&
    typeof body === 'object' &&
    typeof body.mockUserId === 'string' &&
    MOCK_PROFILE_KEYS.includes(body.mockUserId)
  ) {
    profileId = body.mockUserId
  }

  try {
    const res = await fetch(bffUrl('/api/cases'), {
      method: 'POST',
      headers: bffHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ ownerId: userId, profileId })
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'failed to create case' }, { status: 502 })
    }

    const data = (await res.json()) as { caseId: string }
    if (!data?.caseId) {
      return NextResponse.json({ error: 'invalid response from upstream' }, { status: 502 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
