import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";

import { createPersonalAccount } from "#/server/personal-account";
import { getViewer } from "#/server/viewer";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context, location }) => {
    const viewer = await context.queryClient.ensureQueryData({
      queryKey: ["viewer"],
      queryFn: () => getViewer(),
      staleTime: 60_000,
    });

    if (!viewer.signedIn) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
    if (viewer.personalAccount) {
      throw redirect({ to: "/profile" });
    }
  },
  component: Onboarding,
});

function Onboarding() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"property_owner" | "realtor">(
    "property_owner",
  );

  const create = useMutation({
    mutationFn: () =>
      createPersonalAccount({ data: { firstName, lastName, role } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["viewer"] });
      await queryClient.fetchQuery({
        queryKey: ["viewer"],
        queryFn: () => getViewer(),
      });
      await router.invalidate();
      navigate({ to: "/profile" });
    },
  });

  return (
    <main>
      <h1>Tell us about yourself</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          // Double-click guard: once pending, the button is disabled and a
          // second click can't fire mutate() again.
          if (create.isPending) return;
          create.mutate();
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

        <fieldset>
          <legend>Role</legend>
          <label>
            <input
              type="radio"
              name="role"
              value="property_owner"
              checked={role === "property_owner"}
              onChange={() => setRole("property_owner")}
            />
            Property owner
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="realtor"
              checked={role === "realtor"}
              onChange={() => setRole("realtor")}
            />
            Realtor
          </label>
        </fieldset>

        <button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Continue"}
        </button>
      </form>
      {create.isError && <p role="alert">{create.error.message}</p>}
    </main>
  );
}
