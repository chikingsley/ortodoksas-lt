import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getStudioAuthState } from "@/server/auth";

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
  component: Outlet,
});
