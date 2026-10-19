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

export default {
  async fetch(request: Request) {
    const response = await handler.fetch(request);

    return protectStudioResponse(response);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
