import * as stream from "node:stream";

import * as React from "react";
// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/server";
import {
  createStaticHandler,
  type AgnosticDataRouteObject,
  type Params,
} from "@remix-run/router";

export { type Params } from "@remix-run/router";

export function createRequestHandler(routes: AgnosticDataRouteObject[]) {
  return async (request: Request) => {
    const handler = createStaticHandler(routes, {
      future: { v7_relativeSplatPath: true },
    });

    try {
      const context = await handler.query(request);
      if (context instanceof Response) {
        // TODO: re-write redirects
        return context;
      }

      const matches = context.matches as Array<
        (typeof context.matches)[number] & {
          route: {
            Component?: React.FunctionComponent<{
              params: Params<string>;
              children: React.ReactNode;
            }>;
          };
        }
      >;

      let root = null;
      for (let i = matches.length - 1; i >= 0; i--) {
        const {
          params,
          route: { Component },
        } = matches[i];
        if (Component) {
          root = React.createElement(
            Component,
            { params, children: root },
            root
          );
        }
      }

      if (!root) {
        return new Response("Not Found", {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Vary: "Accept",
          },
        });
      }

      const { pipe, abort } = RSD.renderToPipeableStream(
        root,
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
          status: context.statusCode,
          headers: {
            "Content-Type": "text/x-component; charset=utf-8",
            "Transfer-Encoding": "chunked",
            Vary: "Accept",
          },
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
