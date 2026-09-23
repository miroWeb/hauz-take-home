# Agent session

I built this task with Claude (Anthropic), working in a single chat session
end to end. I didn't let it write and hand me a finished app — I had it
build one piece at a time (session/auth foundation → sign-in → onboarding →
profile → header), and after each piece I ran it myself in the browser and
reported back exactly what I saw before moving on. Several real bugs only
showed up this way, not from reading the code.

Roughly, the working order was:

1. Read the task brief and starter repo together, including the
   `personal-account` Function's source, to confirm what the frontend was
   and wasn't allowed to do.
2. Chose the session architecture: an httpOnly cookie holding the Appwrite
   session secret, with an admin (API-key) client used only for the two
   pre-session calls, and a session-scoped client for everything else.
3. Built sign-in (email code), onboarding, profile, and the header
   incrementally, testing each against my own Appwrite Cloud project before
   moving to the next.
4. Hit and fixed two real reactivity bugs during manual testing (below).
5. Wrote `NOTES.md` and this file to document the decisions and the bugs.


## Three things the agent got wrong, that I caught

1. **Stale cache after mutations blocked navigation.** The first version of
   onboarding/profile called `queryClient.invalidateQueries()` after
   creating/updating the account, then navigated. `invalidateQueries` only
   flags a query as stale — it doesn't force a refetch when there's no live
   observer. The route guards use `ensureQueryData`, which returns cached
   data as-is whenever it's already present, ignoring the invalidated flag
   entirely. Result: right after onboarding, `/profile`'s guard still saw
   "no personal account" from the pre-onboarding cache and bounced back to
   `/onboarding`. Fixed in `src/routes/onboarding.tsx`,
   `src/routes/profile.tsx`, and `src/routes/sign-in.tsx` by explicitly
   calling `queryClient.fetchQuery()` (which does respect the invalidated
   flag) before navigating.

2. **Header didn't update without a manual page refresh.** The header read
   its data via `Route.useLoaderData()` on the root route, which is a
   snapshot updated only on navigation. Saving a profile edit or logging out
   changed the underlying data but not the currently-rendered snapshot, so
   the header looked stale until a hard refresh. Fixed in
   `src/routes/__root.tsx` by switching the header to `useSuspenseQuery` on
   the same query key, which subscribes to the cache directly and re-renders
   on any update, independent of routing.

3. **The brief's own product notes suggested an IDOR.** "Send the signed-in
   user's id along with the changes" would let any signed-in user edit
   someone else's profile by supplying a different id. The Function's own
   source comments confirm it only ever trusts the `x-appwrite-user-id`
   header Appwrite injects from the session — no `userId` is sent from the
   client at all. See `src/server/personal-account.ts` and the "Where I
   disagreed with the brief" section of `NOTES.md`.