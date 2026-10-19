declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: { default: { fetch: ExportedHandlerFetchHandler<Env> } };
  }

  interface Env {
    TEST_MIGRATIONS: { name: string; queries: string[] }[];
  }
}
