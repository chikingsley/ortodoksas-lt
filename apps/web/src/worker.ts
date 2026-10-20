import { handle } from "@astrojs/cloudflare/handler";
import { DurableObject, tracing } from "cloudflare:workers";

import { cachedPublication } from "./server/publication-cache";

/** Page rendering uses the Durable Object CPU allowance on Workers Free. */
export class PublicationRenderer extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    const context: ExecutionContext = {
      abort: (reason) => {
        this.ctx.abort(String(reason));
      },
      exports: this.ctx.exports,
      passThroughOnException: () => {
        throw new Error("Publication rendering requires a completed response.");
      },
      props: this.ctx.props,
      tracing,
      waitUntil: (promise) => {
        this.ctx.waitUntil(promise);
      },
    };

    return await handle(request, this.env, context);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    return await cachedPublication(request, async () => {
      // A bounded set of objects shares rendering across concurrent page visits.
      const renderer = env.PUBLICATION_RENDERER.getByName(
        `publication-${pathname.length % 8}`
      );

      return await renderer.fetch(request);
    });
  },
} satisfies ExportedHandler<Env>;
