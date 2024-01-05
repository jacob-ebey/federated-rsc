import * as stream from "node:stream";

import * as React from "react";
import RSD from "react-server-dom-webpack/server.node";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createStaticHandler } from "@remix-run/router";

import { routes } from "./dist/server/main.js";

function createRequestHandler(routes) {
  return async (request) => {
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
        } =
          /** @type {typeof context.matches[number] & { route: { Component: React.FunctionComponent } }} */ (
            context.matches[i]
          );
        if (Component) {
          root = React.createElement(
            Component,
            { params, children: root },
            root
          );
        }
      }

      const { pipe } = RSD.renderToPipeableStream(
        React.createElement(
          React.Fragment,
          null,
          root,
          React.createElement("script", {
            src: "http://localhost:3001/dist/browser/main.js",
          })
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
        stream.Readable.toWeb(pipe(new stream.PassThrough())),
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

const handler = createRequestHandler(routes);

const app = new Hono();

app.use(
  "/dist/browser/*",
  cors({ origin: "*", allowMethods: ["HEAD", "GET"] }),
  serveStatic()
);

app.all("*", async (c) => {
  return handler(c.req.raw);
});

serve({
  ...app,
  port: 3001,
});
