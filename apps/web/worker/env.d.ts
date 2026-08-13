declare module "cloudflare:workers" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: {
      name: string;
      queries: string[];
    }[];
  }
}
