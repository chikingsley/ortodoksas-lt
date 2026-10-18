import { createFileRoute } from "@tanstack/react-router";
import { env as environment } from "cloudflare:workers";

import { requireStudioEditor } from "@/server/auth";
import { getDatabase } from "@/server/db.server";
import { uploadMedia } from "@/server/media/media-operations.server";
import { requireStudioWritesOpen } from "@/server/write-mode";

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await requireStudioEditor(environment);
        requireStudioWritesOpen(environment);

        return await uploadMedia({
          database: getDatabase(environment.DB),
          images: environment.IMAGES,
          media: environment.MEDIA,
          request,
        });
      },
    },
  },
});
