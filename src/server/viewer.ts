import { createServerFn } from '@tanstack/react-start'

import { getCurrentUser } from '#/server/auth'
import { getPersonalAccount, type PersonalAccount } from '#/server/personal-account'

export type Viewer =
  | { signedIn: false }
  | {
      signedIn: true
      userId: string
      email: string
      personalAccount: PersonalAccount | null
    }

export const getViewer = createServerFn({ method: 'GET' }).handler(async (): Promise<Viewer> => {
  const user = await getCurrentUser()
  if (!user) return { signedIn: false }

  const personalAccount = await getPersonalAccount()
  return { signedIn: true, userId: user.id, email: user.email, personalAccount }
})