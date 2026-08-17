import { createFileRoute } from "@tanstack/react-router";

import { StudioWorkspace } from "@/editorial/shell/studio-workspace";

export const Route = createFileRoute("/_studio/articles/")({
  component: () => <StudioWorkspace kind="article" view="content" />,
});
