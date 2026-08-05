import { createMiddleware } from "hono/factory";

import type { StudioEnvironment } from "../types";

const localEditor = {
  id: "local-editor",
  name: "Local editor",
  role: "editor",
} as const;

export const fakeAuth = createMiddleware<StudioEnvironment>(
  async (context, next) => {
    context.set("editor", localEditor);
    await next();
  }
);
