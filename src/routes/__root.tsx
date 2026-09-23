import type { QueryClient } from "@tanstack/react-query";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { logout } from "#/server/auth";
import { getViewer } from "#/server/viewer";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HAUZ" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["viewer"],
      queryFn: () => getViewer(),
      staleTime: 60_000,
    }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const { data: viewer } = useSuspenseQuery({
    queryKey: ["viewer"],
    queryFn: () => getViewer(),
    staleTime: 60_000,
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["viewer"] });
      await router.invalidate();

      const logoutMutation = useMutation({
        mutationFn: () => logout(),
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["viewer"] });
          await queryClient.fetchQuery({
            queryKey: ["viewer"],
            queryFn: () => getViewer(),
          });
          await router.invalidate();
          router.navigate({ to: "/" });
        },
      });

      if (logoutMutation.isError) {
        console.error("Logout failed:", logoutMutation.error);
      }
      router.navigate({ to: "/" });
    },
  });

  if (!viewer.signedIn) {
    return (
      <header>
        <Link to="/sign-in" search={{ redirect: router.state.location.href }}>
          Sign in
        </Link>
      </header>
    );
  }

  // Right after sign-in, before onboarding, there is no firstName yet — the
  // brief's "either Sign in, or the person's first name" doesn't cover that
  // gap explicitly, so we fall back to the email until onboarding finishes.
  // (Noted in NOTES.md.)
  const displayName = viewer.personalAccount?.firstName ?? viewer.email;

  return (
    <header>
      <span>{displayName}</span>
      <button
        type="button"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        Log out
      </button>
    </header>
  );
}
