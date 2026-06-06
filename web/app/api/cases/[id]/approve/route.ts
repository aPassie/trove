import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/case-ownership'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isSameOrigin } from '@/lib/origin'
import { bffUrl, bffHeaders } from '@/lib/internal-api'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (typeof id !== 'string' || id.length < 1) {
    return NextResponse.json({ error: 'invalid case id' }, { status: 400 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const clientIp = getClientIp(req)
  if (!checkRateLimit(`approve-case:${clientIp}`, 10)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  }

  let userId: string
  try {
    userId = await getSessionUserId()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(bffUrl(`/api/cases/${encodeURIComponent(id)}/approve`), {
      method: 'POST',
      headers: bffHeaders({ 'x-trove-user': userId })
    })
    if (res.status === 403) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    if (res.status === 404) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'failed to approve case' }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
