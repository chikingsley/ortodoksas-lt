import { createFileRoute } from "@tanstack/react-router";

import { DirectoryRouteWorkspace } from "@/editorial/directories/directory-workspace";
import { communityDirectoryQueryOptions } from "@/server/directories/directory.functions";

export const Route = createFileRoute("/_studio/communities")({
  component: () => <DirectoryRouteWorkspace kind="communities" />,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(communityDirectoryQueryOptions()),
});
