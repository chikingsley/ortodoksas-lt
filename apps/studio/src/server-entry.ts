import handler from "@tanstack/react-start/server-entry";

interface StudioRequestContext {
  cloudflare: {
    environment: Cloudflare.Env;
    executionContext: ExecutionContext;
  };
}

declare module "@tanstack/react-router" {
  interface Register {
    server: {
      requestContext: StudioRequestContext;
    };
  }
}

export default {
  fetch(
    request: Request,
    environment: Cloudflare.Env,
    executionContext: ExecutionContext
  ) {
    return handler.fetch(request, {
      context: { cloudflare: { environment, executionContext } },
    });
  },
};
