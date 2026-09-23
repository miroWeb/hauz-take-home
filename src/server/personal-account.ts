import { createServerFn } from '@tanstack/react-start'
import { ExecutionMethod, Functions } from 'node-appwrite'
import { z } from 'zod'

import { createSessionClient, functionId } from '#/lib/appwrite.server'
import { clearSessionCookie, readSessionCookie } from '#/lib/session.server'

export type PersonalAccount = {
  personalAccountId: string
  firstName: string
  lastName: string
  role: 'property_owner' | 'realtor'
  contactEmail: string | null
  bio: string | null
}

class FunctionApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * Every call rides on the caller's own Appwrite session. The Function derives
 * identity from `x-appwrite-user-id`, a header Appwrite injects itself — so
 * there is deliberately no `userId` parameter here. (The brief suggests
 * sending it from the client; see NOTES.md for why that isn't done.)
 */
async function callFunction(method: ExecutionMethod, path: string, body?: unknown) {
  const secret = readSessionCookie()
  if (!secret) throw new FunctionApiError(401, 'unauthorized', 'Not signed in.')

  const functions = new Functions(createSessionClient(secret))
  const execution = await functions.createExecution(
    functionId(),
    body ? JSON.stringify(body) : undefined,
    false,
    path,
    method,
  )

  const parsed = execution.responseBody ? JSON.parse(execution.responseBody) : {}

  if (execution.responseStatusCode >= 400) {
    if (execution.responseStatusCode === 401) clearSessionCookie()
    throw new FunctionApiError(
      execution.responseStatusCode,
      parsed.error ?? 'unknown',
      parsed.message ?? 'The request failed.',
    )
  }

  return parsed
}

export const getPersonalAccount = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PersonalAccount | null> => {
    try {
      return (await callFunction(ExecutionMethod.GET, '/personal-account')) as PersonalAccount
    } catch (error) {
      if (error instanceof FunctionApiError && error.status === 404) return null
      throw error
    }
  },
)

export const createPersonalAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      role: z.enum(['property_owner', 'realtor']),
    }),
  )
  .handler(async ({ data }) => {
    return (await callFunction(ExecutionMethod.POST, '/personal-account', data)) as PersonalAccount
  })

export const updatePersonalAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      contactEmail: z.email().nullable().optional(),
      bio: z.string().trim().min(1).max(2000).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return (await callFunction(ExecutionMethod.PATCH, '/personal-account', data)) as PersonalAccount
  })