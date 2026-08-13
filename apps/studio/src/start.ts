import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { parseAuthorizedParties } from "./server/authorized-parties";

const runtimeEnvironment = () =>
  (
    globalThis as typeof globalThis & {
      process?: { env?: { CLERK_AUTHORIZED_PARTIES?: string } };
    }
  ).process?.env;

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) =>
    context.handlerType === "serverFn" ||
    (context.handlerType === "router" &&
      !["GET", "HEAD", "OPTIONS"].includes(context.request.method)),
});

export const startInstance = createStart(() => ({
  requestMiddleware: [
    clerkMiddleware(() => ({
      authorizedParties: parseAuthorizedParties(
        runtimeEnvironment()?.CLERK_AUTHORIZED_PARTIES
      ),
    })),
    csrfMiddleware,
  ],
}));
