import { Hono } from "hono";

import { fakeAuth } from "./middleware/fake-auth";
import { articleRoutes } from "./routes/articles";
import { mediaRoutes } from "./routes/media";
import type { StudioEnvironment } from "./types";

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

app.use("/api/*", fakeAuth);

app.get("/api/health", (context) =>
  context.json({
    contentSchema: 1,
    service: "ortodoksas-studio",
    status: "ready",
  })
);

app.get("/api/session", (context) =>
  context.json({
    authentication: "development",
    editor: context.get("editor"),
  })
);

app.route("/api/articles", articleRoutes);
app.route("/api/media", mediaRoutes);

app.notFound((context) => context.json({ error: "Route unavailable" }, 404));

export default app;
