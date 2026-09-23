import { createServerFn } from '@tanstack/react-start'
import { Account, ID } from 'node-appwrite'
import { z } from 'zod'

import { createAdminClient, createSessionClient } from '#/lib/appwrite.server'
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from '#/lib/session.server'

export const requestEmailCode = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.email() }))
  .handler(async ({ data }) => {
    const account = new Account(createAdminClient())
    const token = await account.createEmailToken(ID.unique(), data.email)
    // The code itself is emailed to the person, never returned here. We only
    // carry Appwrite's userId forward to the verify step — note this is the
    // EXISTING user's id if that email already has an account, not
    // necessarily the id we generated.
    return { userId: token.userId }
  })

export const verifyEmailCode = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string().min(1), secret: z.string().min(1) }))
  .handler(async ({ data }) => {
    const account = new Account(createAdminClient())
    const session = await account.createSession(data.userId, data.secret)
    writeSessionCookie(session.secret)
    return { success: true as const }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const secret = readSessionCookie()
  if (secret) {
    try {
      await new Account(createSessionClient(secret)).deleteSession('current')
    } catch {
      // Already invalid/expired — fine, we clear the cookie regardless.
    }
  }
  clearSessionCookie()
  return { success: true as const }
})

/**
 * "If loading the current user fails for any reason, treat the person as
 * signed out" lives here: any Appwrite error (expired session, hiccup,
 * whatever) clears the cookie and reports signed-out instead of bubbling up.
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const secret = readSessionCookie()
  if (!secret) return null

  try {
    const user = await new Account(createSessionClient(secret)).get()
    return { id: user.$id, email: user.email }
  } catch {
    clearSessionCookie()
    return null
  }
})