import { auth } from './auth'

// in-memory case-to-user ownership map.
// NOTE: ephemeral per-instance in serverless — not shared across Vercel replicas.
// For V1 demo this is acceptable; for production, replace with KV or DB-backed lookup.
const ownership = new Map<string, string>()

export function setCaseOwner(caseId: string, userId: string): void {
  ownership.set(caseId, userId)
}

export function isCaseOwner(caseId: string, userId: string): boolean {
  return ownership.get(caseId) === userId
}

export async function requireCaseAccess(caseId: string): Promise<{ userId: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('unauthorized')
  }
  if (!isCaseOwner(caseId, session.user.id)) {
    throw new Error('forbidden')
  }
  return { userId: session.user.id }
}

export async function getSessionUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('unauthorized')
  }
  return session.user.id
}
