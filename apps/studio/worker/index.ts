import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";

import { clerkAuth } from "./middleware/clerk-auth";
import { articleRoutes } from "./routes/articles";
import { homepageRoutes } from "./routes/homepage";
import { mediaRoutes } from "./routes/media";
import type { StudioEnvironment } from "./types";

export const createStudioApp = (
  authentication: MiddlewareHandler<StudioEnvironment> = clerkAuth
) => {
  const app = new Hono<StudioEnvironment>();

  app.onError((error, context) => {
    console.error(
      JSON.stringify({
        event: "request_failed",
        message: error.message,
        path: context.req.path,
      })
    );

    return context.json({ error: "Request failed" }, 500);
  });

  app.use("/api/*", authentication);

  app.get("/api/health", (context) =>
    context.json({
      contentSchema: 2,
      service: "ortodoksas-studio",
      status: "ready",
    })
  );

  app.get("/api/session", (context) =>
    context.json({
      authentication: "clerk",
      editor: context.get("editor"),
    })
  );

  app.route("/api/articles", articleRoutes);
  app.route("/api/homepage", homepageRoutes);
  app.route("/api/media", mediaRoutes);

  app.notFound((context) => context.json({ error: "Route unavailable" }, 404));

  return app;
};

const app = createStudioApp();

export default app;
