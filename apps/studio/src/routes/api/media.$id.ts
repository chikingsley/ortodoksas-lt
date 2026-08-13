import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ context, params, request }) => {
        const [{ getDatabase }, { serveMedia }, { requireStudioEditor }] =
          await Promise.all([
            import("../../../worker/db"),
            import("../../../worker/services/media-operations"),
            import("../../server/auth"),
          ]);
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
