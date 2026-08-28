import { createFileRoute } from "@tanstack/react-router";

import { requireStudioEditor } from "@/server/auth";
import { getDatabase } from "@/server/db.server";
import { serveMedia } from "@/server/media/media-operations.server";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ context, params, request }) => {
        const { environment } = context.cloudflare as {
          environment: Cloudflare.Env;
        };
        await requireStudioEditor(environment);
        return serveMedia({
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
