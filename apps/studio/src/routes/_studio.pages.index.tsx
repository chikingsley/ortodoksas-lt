import { createFileRoute } from "@tanstack/react-router";

import { StudioWorkspace } from "@/editorial/shell/studio-workspace";

export const Route = createFileRoute("/_studio/pages/")({
  component: () => <StudioWorkspace kind="page" view="content" />,
});
