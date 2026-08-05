interface OAuthBindings {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
}

const localeAliases = new Map([
  ["", "/index.html"],
  ["/admin", "/admin/index.html"],
  ["/en", "/en.html"],
  ["/ru", "/ru.html"],
  ["/uk", "/uk.html"],
  ["/be", "/be.html"],
]);
const trailingSlash = /\/$/;

function cleanRouteAlias(pathname: string) {
  const path = pathname.replace(trailingSlash, "");
  if (
    path === "/archyvas" ||
    path === "/paieska" ||
    path === "/404" ||
    path.startsWith("/tema/")
  ) {
    return `${path}.html`;
  }
}

function bindings(env: Env) {
  return env as Env & OAuthBindings;
}

function redirectUri(request: Request, env: Env & OAuthBindings) {
  return (
    env.GITHUB_REDIRECT_URI ??
    new URL("/api/auth/callback", request.url).toString()
  );
}

function readCookie(request: Request, name: string) {
  return request.headers
    .get("Cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function oauthUnavailable() {
  return Response.json(
    {
      error:
        "GitHub OAuth is not configured. Add secrets through Wrangler bindings.",
    },
    { status: 503 }
  );
}

function startOAuth(request: Request, env: Env & OAuthBindings) {
  if (!env.GITHUB_CLIENT_ID) {
    return oauthUnavailable();
  }
  const state = crypto.randomUUID();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", redirectUri(request, env));
  authorize.searchParams.set("scope", "repo");
  authorize.searchParams.set("state", state);
  return new Response(null, {
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": `oauth_state=${state}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
    status: 302,
  });
}

async function finishOAuth(request: Request, env: Env & OAuthBindings) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)) {
    return oauthUnavailable();
  }
  if (!(code && state) || state !== readCookie(request, "oauth_state")) {
    return Response.json({ error: "Invalid OAuth state." }, { status: 400 });
  }

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri(request, env),
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  );
  const token = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!token.access_token) {
    return Response.json(
      { error: token.error ?? "GitHub OAuth token exchange failed." },
      { status: 502 }
    );
  }

  const payload = JSON.stringify({ token: token.access_token }).replace(
    /</g,
    "\\u003c"
  );
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Authorization complete</title><script>window.opener.postMessage("authorization:github:success:${payload}", window.location.origin); window.close();</script><p>Authorization complete. You can close this window.</p>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie":
          "oauth_state=; Path=/api/auth; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
      },
    }
  );
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    const configuredEnv = bindings(env);
    if (url.pathname === "/api/health") {
      return Response.json({ environment: env.ENVIRONMENT, status: "ok" });
    }
    if (url.pathname === "/api/auth" && request.method === "GET") {
      return startOAuth(request, configuredEnv);
    }
    if (url.pathname === "/api/auth/callback" && request.method === "GET") {
      return finishOAuth(request, configuredEnv);
    }

    const alias = localeAliases.get(url.pathname.replace(trailingSlash, ""));
    const routeAlias = cleanRouteAlias(url.pathname);
    if ((alias ?? routeAlias) && request.method === "GET") {
      const assetUrl = new URL(alias ?? routeAlias ?? url.pathname, url);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
