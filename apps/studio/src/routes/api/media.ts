import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      POST: async ({ context, request }) => {
        const [
          { getDatabase },
          { uploadMedia },
          { requireStudioEditor },
          { requireStudioWritesOpen },
        ] = await Promise.all([
          import("../../../worker/db"),
          import("../../../worker/services/media-operations"),
          import("../../server/auth"),
          import("../../server/write-mode"),
        ]);
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
