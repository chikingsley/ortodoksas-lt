import { createFileRoute, redirect } from "@tanstack/react-router";

import { TeamWorkspace } from "@/editorial/team/team-workspace";

export const Route = createFileRoute("/_studio/team")({
  beforeLoad: ({ context }) => {
    if (context.studioRole !== "admin") {
      throw redirect({ to: "/articles" });
    }
  },
  component: TeamWorkspace,
});
