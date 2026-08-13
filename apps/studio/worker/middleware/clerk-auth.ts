import { createClerkClient } from "@clerk/backend";
import { createMiddleware } from "hono/factory";

import type { StudioEnvironment } from "../types";

const getAuthorizedParties = (
  request: Request,
  configuredParties: string | undefined
): string[] => {
  const parties = configuredParties
    ?.split(",")
    .map((party) => party.trim())
    .filter(Boolean);

  return parties?.length ? parties : [new URL(request.url).origin];
};

const isAdmin = (userId: string, configuredUserIds: string | undefined) =>
  configuredUserIds
    ?.split(",")
    .map((configuredUserId) => configuredUserId.trim())
    .filter(Boolean)
    .includes(userId) ?? false;

export const clerkAuth = createMiddleware<StudioEnvironment>(
  async (context, next) => {
    const { CLERK_SECRET_KEY, VITE_CLERK_PUBLISHABLE_KEY } = context.env;

    if (!(CLERK_SECRET_KEY && VITE_CLERK_PUBLISHABLE_KEY)) {
      return context.json({ error: "Authentication is unavailable" }, 503);
    }

    const clerk = createClerkClient({
      publishableKey: VITE_CLERK_PUBLISHABLE_KEY,
      secretKey: CLERK_SECRET_KEY,
    });
    const requestState = await clerk.authenticateRequest(context.req.raw, {
      authorizedParties: getAuthorizedParties(
        context.req.raw,
        context.env.CLERK_AUTHORIZED_PARTIES
      ),
    });

    if (!requestState.isAuthenticated) {
      const headers = new Headers(requestState.headers);
      headers.set("content-type", "application/json; charset=UTF-8");

      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          headers,
          status: 401,
        }
      );
    }

    const auth = requestState.toAuth();
    context.set("editor", {
      id: auth.userId,
      name: "Clerk editor",
      role: isAdmin(auth.userId, context.env.CLERK_ADMIN_USER_IDS)
        ? "admin"
        : "editor",
    });
    await next();
  }
);
