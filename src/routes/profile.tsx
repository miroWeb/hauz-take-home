import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { updatePersonalAccount } from "#/server/personal-account";
import { getViewer } from "#/server/viewer";

export const Route = createFileRoute("/profile")({
  beforeLoad: async ({ context, location }) => {
    const viewer = await context.queryClient.ensureQueryData({
      queryKey: ["viewer"],
      queryFn: () => getViewer(),
      staleTime: 60_000,
    });

    if (!viewer.signedIn) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
    if (!viewer.personalAccount) {
      throw redirect({ to: "/onboarding" });
    }

    return { viewer };
  },
  component: Profile,
});

function Profile() {
  const { viewer } = Route.useRouteContext();
  const account = viewer.signedIn ? viewer.personalAccount : null;
  const queryClient = useQueryClient();
  const router = useRouter();

  const [firstName, setFirstName] = useState(account?.firstName ?? "");
  const [lastName, setLastName] = useState(account?.lastName ?? "");
  const [contactEmail, setContactEmail] = useState(account?.contactEmail ?? "");
  const [bio, setBio] = useState(account?.bio ?? "");

  const update = useMutation({
    mutationFn: () =>
      updatePersonalAccount({
        data: {
          firstName,
          lastName,
          // Empty field in the form = "clear it" → send null, not "".
          contactEmail: contactEmail.trim() === "" ? null : contactEmail.trim(),
          bio: bio.trim() === "" ? null : bio.trim(),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["viewer"] });
      await queryClient.fetchQuery({
        queryKey: ["viewer"],
        queryFn: () => getViewer(),
      });
      await router.invalidate();
    },
  });

  if (!account) return null;

  return (
    <main>
      <h1>Profile</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate();
        }}
      >
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          required
        />

        <label htmlFor="lastName">Last name</label>
        <input
          id="lastName"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          required
        />

        <label htmlFor="contactEmail">Contact email</label>
        <input
          id="contactEmail"
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="Optional"
        />

        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Optional"
        />

        <p>
          Role:{" "}
          {account.role === "property_owner" ? "Property owner" : "Realtor"}{" "}
          (cannot be changed)
        </p>

        <button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save"}
        </button>
      </form>
      {update.isError && <p role="alert">{update.error.message}</p>}
    </main>
  );
}
