import { createFileRoute } from "@tanstack/react-router";

import { requireStudioEditor } from "@/server/auth";
import { getDatabase } from "@/server/db.server";
import { uploadMedia } from "@/server/media/media-operations.server";
import { requireStudioWritesOpen } from "@/server/write-mode";

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      POST: async ({ context, request }) => {
        const { environment } = context.cloudflare as {
          environment: Cloudflare.Env;
        };
        await requireStudioEditor(environment);
        requireStudioWritesOpen(environment);
        return uploadMedia({
          database: getDatabase(environment.DB),
          images: environment.IMAGES,
          media: environment.MEDIA,
          request,
        });
      },
    },
  },
});
