import { createFileRoute } from "@tanstack/react-router";
import { env as environment } from "cloudflare:workers";

import { requireStudioEditor } from "@/server/auth";
import { getDatabase } from "@/server/db.server";
import { serveMedia } from "@/server/media/media-operations.server";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        await requireStudioEditor(environment);

        return await serveMedia({
          database: getDatabase(environment.DB),
          id: params.id,
          images: environment.IMAGES,
          media: environment.MEDIA,
          request,
        });
      },
    },
  },
});
