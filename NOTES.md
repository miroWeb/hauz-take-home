# Notes

## Main decisions

- **Session storage.** The Appwrite session secret is stored only in an httpOnly,
  SameSite=Lax cookie (`hauz_session`), written server-side. Browser JS never
  reads it. Two calls happen before any session exists — `createEmailToken`
  and `createSession` — and use an API-key client, because Appwrite only
  returns the raw secret in the response when the caller is API-key
  authenticated (this is Appwrite's own documented SSR pattern). Every other
  call (`Account.get`, the Function execution) uses a session-scoped client
  built from the cookie.

- **`getViewer()` as a single source of truth.** One server function combines
  `Account.get()` with `GET /personal-account` into one `Viewer` shape, reused
  by the root loader, the onboarding guard, and the profile guard, so sign-in
  state and onboarding state can never disagree between pages.

- **Header reactivity.** The root loader uses `ensureQueryData` so the header
  is correct on first paint (SSR, no flash). The header component itself uses
  `useSuspenseQuery` on the same query key, so it also updates live after
  sign-in/out or a profile edit, without needing a full page reload.

- **Redirect safety.** The `redirect` search param is only honored if it's a
  same-app path (starts with a single `/`), to avoid an open redirect.

- **PATCH semantics.** The profile form explicitly sends `null` for a field
  the person cleared, and omits fields they didn't touch — matching "leave
  out keeps the value, null clears it."

- **Double-submit.** The onboarding button disables itself while the request
  is in flight; combined with the Function's own unique-index-driven
  200/201/409 responses, a double-click can't create two accounts.

## Where I disagreed with the brief

The brief's product notes say: *"The profile form should send the signed-in
user's id along with the changes, so the Function knows whose profile to
update."* I didn't implement this. The Function only ever trusts
`x-appwrite-user-id`, a header Appwrite injects from the caller's session and
that no caller-supplied header can override — the Function's own source
comments say so explicitly. If the frontend sent a `userId` and the Function
used it, any signed-in user could edit another user's profile by supplying a
different id (an IDOR). Identity flows entirely from the session cookie; no
`userId` is ever sent from the client.

## An ambiguity I resolved myself

"Either Sign in, or the person's first name" doesn't cover the gap between
finishing sign-in and finishing onboarding, where there's no personal account
(and so no firstName) yet. In that window the header falls back to the
account's email rather than showing nothing.

## What I'd do before production

- Rate-limit the email-code request per email/IP.
- Add CSRF protection for the server functions.
- Add a regression test that hits the Function directly with one user's
  session but another user's id in the body, asserting it still only ever
  touches the caller's own record.
- Replace TanStack Router's generic not-found page with a real one.
- Tune the session cookie's lifetime to match the Appwrite project's actual
  session length instead of a fixed 30 days.