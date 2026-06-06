import { auth } from './auth'

export async function getSessionUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('unauthorized')
  }
  return session.user.id
}
