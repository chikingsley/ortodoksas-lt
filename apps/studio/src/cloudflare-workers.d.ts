declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}

// biome-ignore lint/style/noNamespace: Cloudflare runtime bindings use this global namespace.
declare namespace Cloudflare {
  interface Env {
    CLERK_ALLOWED_USER_IDS?: string;
  }
}
