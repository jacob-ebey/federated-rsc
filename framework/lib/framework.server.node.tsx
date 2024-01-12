import * as stream from "node:stream";

// @ts-ignore - no types
import RSD from "react-server-dom-webpack/server";
import { type AgnosticDataRouteObject } from "@remix-run/router";

export { type Params } from "@remix-run/router";

import { createStaticRequestHandler } from "framework/server.shared";

export function createRequestHandler(routes: AgnosticDataRouteObject[]) {
  return async (request: Request) => {
    const handler = createStaticRequestHandler(routes);

    try {
      const context = await handler(request);

      if (context instanceof Response) {
        return context;
      }

      const { pipe, abort } = RSD.renderToPipeableStream(
        context.root,
        new Proxy(
          {},
          {
            get(_, prop, __) {
              const [___, ...exposedRest] = String(prop).split(":");
              const [____, ...exportedRest] = exposedRest.join(":").split("#");
              const exported = exportedRest.join("#");

              return {
                id: prop,
                name: exported,
                chunks: [prop],
                async: true,
              };
            },
          }
        ),
        {
          identifierPrefix: Date.now().toString(36),
          onError(error: Error) {
            console.error(error);
          },
        }
      );

      request.signal.addEventListener("abort", abort, { once: true });

      return new Response(
        stream.Readable.toWeb(
          pipe(new stream.PassThrough())
        ) as ReadableStream<Uint8Array>,
        {
          status: context.status,
          headers: context.headers,
        }
      );
    } catch (reason) {
      console.error(reason);
      return new Response("Internal Server Error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Vary: "Accept",
        },
      });
    }
  };
}
