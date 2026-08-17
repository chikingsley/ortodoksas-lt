import handler from "@tanstack/react-start/server-entry";

const PRIVATE_CACHE_CONTROL = "private, no-store";

const protectStudioResponse = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set("cache-control", PRIVATE_CACHE_CONTROL);
  headers.set("cdn-cache-control", "no-store");
  headers.set("cloudflare-cdn-cache-control", "no-store");
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

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
  async fetch(
    request: Request,
    environment: Cloudflare.Env,
    executionContext: ExecutionContext
  ) {
    const response = await handler.fetch(request, {
      context: { cloudflare: { environment, executionContext } },
    });
    return protectStudioResponse(response);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
