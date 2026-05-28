import { NextResponse } from 'next/server'
import { requireCaseAccess } from '@/lib/case-ownership'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (typeof id !== 'string' || id.length < 1) {
    return NextResponse.json({ error: 'invalid case id' }, { status: 400 })
  }

  try {
    await requireCaseAccess(id)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'unauthorized') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const bffUrl = process.env.BFF_URL || 'http://localhost:8789'

  try {
    const res = await fetch(`${bffUrl}/api/cases/${encodeURIComponent(id)}`)
    if (!res.ok) {
      return NextResponse.json({ error: 'failed to fetch case' }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
