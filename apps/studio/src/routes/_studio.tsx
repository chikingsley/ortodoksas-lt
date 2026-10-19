import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { StudioShell } from "@/editorial/shell/studio-shell";
import { getStudioAuthState } from "@/server/auth";

function StudioLayout() {
  return (
    <StudioShell>
      <Outlet />
    </StudioShell>
  );
}

export const Route = createFileRoute("/_studio")({
  beforeLoad: async () => {
    const authentication = await getStudioAuthState();

    if (!authentication.isAuthenticated) {
      throw redirect({ to: "/sign-in" });
    }

    if (!authentication.isAuthorized) {
      throw redirect({ to: "/access-denied" });
    }

    return {
      studioRole: authentication.role,
      userId: authentication.userId,
    };
  },
  component: StudioLayout,
});
