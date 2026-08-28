// biome-ignore lint/style/noNamespace: Cloudflare augments generated Worker bindings through this global namespace.
declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: {
      name: string;
      queries: string[];
    }[];
  }
}
