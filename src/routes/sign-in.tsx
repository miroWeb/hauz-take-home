import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import { getViewer } from "#/server/viewer";

import { requestEmailCode, verifyEmailCode } from "#/server/auth";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/sign-in")({
  validateSearch: searchSchema,
  component: SignIn,
});

/** ================ Only ever redirect inside this app — never let `redirect` point elsewhere. */
function safeRedirectTarget(raw: string | undefined) {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function SignIn() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");

  const requestCode = useMutation({
    mutationFn: () => requestEmailCode({ data: { email } }),
    onSuccess: (result) => {
      setUserId(result.userId);
      setStep("code");
    },
  });

  const verifyCode = useMutation({
    mutationFn: () => verifyEmailCode({ data: { userId, secret: code } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["viewer"] });
      await queryClient.fetchQuery({
        queryKey: ["viewer"],
        queryFn: () => getViewer(),
      });
      await router.invalidate();
      navigate({ to: safeRedirectTarget(redirect) });
    },
  });

  if (step === "email") {
    return (
      <main>
        <h1>Sign in</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            requestCode.mutate();
          }}
        >
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button type="submit" disabled={requestCode.isPending}>
            {requestCode.isPending ? "Sending…" : "Send code"}
          </button>
        </form>
        {requestCode.isError && <p role="alert">{requestCode.error.message}</p>}
      </main>
    );
  }

  return (
    <main>
      <h1>Enter the code</h1>
      <p>We sent a code to {email}.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          verifyCode.mutate();
        }}
      >
        <label htmlFor="code">Code</label>
        <input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />
        <button type="submit" disabled={verifyCode.isPending}>
          {verifyCode.isPending ? "Verifying…" : "Continue"}
        </button>
      </form>
      {verifyCode.isError && <p role="alert">{verifyCode.error.message}</p>}
    </main>
  );
}
