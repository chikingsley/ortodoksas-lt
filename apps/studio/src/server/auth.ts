import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

export interface StudioEditor {
  id: string;
}

const parseUserIds = (value: string | undefined) =>
  new Set(
    value
      ?.split(",")
      .map((userId) => userId.trim())
      .filter(Boolean) ?? []
  );

const getAuthorizedEditor = (
  authentication: {
    isAuthenticated: boolean;
    userId: string | null;
  },
  environment: Pick<Cloudflare.Env, "CLERK_ALLOWED_USER_IDS">
): StudioEditor | null => {
  if (!(authentication.isAuthenticated && authentication.userId)) {
    return null;
  }
  if (
    !parseUserIds(environment.CLERK_ALLOWED_USER_IDS).has(authentication.userId)
  ) {
    return null;
  }
  return {
    id: authentication.userId,
  };
};

export const requireStudioEditor = async (
  environment: Pick<Cloudflare.Env, "CLERK_ALLOWED_USER_IDS">
): Promise<StudioEditor> => {
  const authentication = await auth();
  if (!(authentication.isAuthenticated && authentication.userId)) {
    throw Response.json({ error: "Authentication required" }, { status: 401 });
  }
  const editor = getAuthorizedEditor(authentication, environment);
  if (!editor) {
    throw Response.json(
      { error: "Studio access requires an allowlisted account" },
      { status: 403 }
    );
  }
  return editor;
};

export const getStudioAuthState = createServerFn({ method: "GET" }).handler(
  async () => {
    const { env } = await import("cloudflare:workers");
    const authentication = await auth();
    const editor = getAuthorizedEditor(authentication, env);
    return {
      isAuthenticated: authentication.isAuthenticated,
      isAuthorized: editor !== null,
      userId: authentication.userId,
    };
  }
);
