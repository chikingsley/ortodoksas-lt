export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ environment: env.ENVIRONMENT, status: "ok" });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
