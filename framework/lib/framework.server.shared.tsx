import * as React from "react";

import {
  createStaticHandler,
  type AgnosticDataRouteObject,
  type Params,
} from "@remix-run/router";

import { Route, Router } from "framework/client";

export function createStaticRequestHandler(routes: AgnosticDataRouteObject[]) {
  const handler = createStaticHandler(routes, {
    future: { v7_relativeSplatPath: true },
  });

  return async (request: Request) => {
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
          }> & {
            api?: boolean;
          };
        };
      }
    >;

    let lastRouteId = null;
    let toRender: React.ReactElement | string | null = null;
    const routes: null | Record<string, React.ReactElement> = matches[
      matches.length - 1
    ]?.route.Component?.api
      ? null
      : {};

    for (let i = matches.length - 1; i >= 0; i--) {
      const {
        params,
        route: { Component, id },
      } = matches[i];
      if (Component) {
        if (!routes) {
          toRender = React.createElement(Component, {
            params,
            children: toRender,
          });
        } else {
          routes[id] = React.createElement(Component, {
            params,
            children: lastRouteId ? (
              <Route key={lastRouteId} id={lastRouteId} />
            ) : null,
          });

          toRender = lastRouteId = id;
        }
      }
    }

    if (!toRender) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Vary: "Accept",
        },
      });
    }

    let root: React.ReactElement;
    if (typeof toRender === "string") {
      root = (
        <Router routes={routes!}>
          <Route id={toRender} />
        </Router>
      );
    } else {
      root = toRender;
    }

    return {
      root,
      status: context.statusCode,
      headers: new Headers({
        "Content-Type": "text/x-component; charset=utf-8",
        "Transfer-Encoding": "chunked",
        Vary: "Accept",
      }),
    };
  };
}
