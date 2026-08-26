import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

import { getAuthorizedEditor, type StudioEditor } from "./auth-policy";

export type { StudioEditor, StudioRole } from "./auth-policy";

export const requireStudioEditor = async (
  environment: Pick<Cloudflare.Env, "CLERK_ORGANIZATION_ID">
): Promise<StudioEditor> => {
  const authentication = await auth();
  if (!(authentication.isAuthenticated && authentication.userId)) {
    throw Response.json({ error: "Authentication required" }, { status: 401 });
  }
  const editor = getAuthorizedEditor(
    authentication,
    environment.CLERK_ORGANIZATION_ID
  );
  if (!editor) {
    throw Response.json(
      { error: "Studio access requires organization membership" },
      { status: 403 }
    );
  }
  return editor;
};

export const getStudioAuthState = createServerFn({ method: "GET" }).handler(
  async () => {
    const { env } = await import("cloudflare:workers");
    const authentication = await auth();
    const editor = getAuthorizedEditor(
      authentication,
      env.CLERK_ORGANIZATION_ID
    );
    return {
      isAuthenticated: authentication.isAuthenticated,
      isAuthorized: editor !== null,
      role: editor?.role ?? null,
      userId: authentication.userId,
    };
  }
);
