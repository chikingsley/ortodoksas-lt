import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { z } from "zod";

import { parseAuthorizedParties } from "./server/authorized-parties";

const runtimeEnvironmentSchema = z.object({
  process: z
    .object({
      env: z
        .object({ CLERK_AUTHORIZED_PARTIES: z.string().optional() })
        .optional(),
    })
    .optional(),
});

const runtimeEnvironment = () =>
  runtimeEnvironmentSchema.parse(globalThis).process?.env;

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
