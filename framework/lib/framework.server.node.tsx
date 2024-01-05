import * as stream from "node:stream";

import * as React from "react";
// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/server.node";
import {
  createStaticHandler,
  type AgnosticDataRouteObject,
  type Params,
} from "@remix-run/router";

export function createRequestHandler(
  routes: AgnosticDataRouteObject[],
  scripts: string[]
) {
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

      let root = null;
      for (let i = context.matches.length - 1; i >= 0; i--) {
        const {
          params,
          route: { Component },
        } = context.matches[i] as (typeof context.matches)[number] & {
          route: {
            Component: React.FunctionComponent<{
              params: Params<string>;
              children: React.ReactNode;
            }>;
          };
        };
        if (Component) {
          root = React.createElement(
            Component,
            { params, children: root },
            root
          );
        }
      }

      if (!root) {
        return new Response(null, { status: 404 });
      }

      const { pipe } = RSD.renderToPipeableStream(
        React.createElement(
          React.Fragment,
          null,
          root,
          ...scripts.map((src) => React.createElement("script", { src }))
        ),
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
        )
      );
      return new Response(
        stream.Readable.toWeb(
          pipe(new stream.PassThrough())
        ) as ReadableStream<Uint8Array>,
        {
          status: context.statusCode,
          headers: {
            "Content-Type": "text/x-component",
            "Transfer-Encoding": "chunked",
          },
        }
      );
    } catch (reason) {
      console.error(reason);
      return new Response(null, { status: 500 });
    }
  };
}
