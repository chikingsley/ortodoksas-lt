import { createFileRoute } from "@tanstack/react-router";

import { DirectoryRouteWorkspace } from "@/editorial/directories/directory-workspace";
import { peopleDirectoryQueryOptions } from "@/server/directories/directory.functions";

export const Route = createFileRoute("/_studio/people")({
  component: () => <DirectoryRouteWorkspace kind="people" />,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(peopleDirectoryQueryOptions()),
});
