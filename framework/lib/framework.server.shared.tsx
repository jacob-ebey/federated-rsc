import * as React from "react";

import {
  createStaticHandler,
  type AgnosticDataRouteObject,
  type Params,
} from "@remix-run/router";

import { Outlet, OutletProvider } from "framework/client";

declare global {
  const ___CONTAINER_NAME___: string;
}

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
          }>;
        };
      }
    >;

    let lastRouteId = "!";
    let toRender: React.ReactElement | string | null = null;
    const routes: null | Record<string, React.ReactElement> =
      request.headers.has("Api") ? null : {};

    for (let i = matches.length - 1; i >= 0; i--) {
      const {
        params,
        route: { Component, id },
      } = matches[i];
      if (Component) {
        let aliasedId = ___CONTAINER_NAME___ + "/" + id;

        if (!routes) {
          toRender = <Component params={params}>{toRender}</Component>;
        } else {
          routes[aliasedId] = (
            <Component params={params}>
              <Outlet key={lastRouteId} id={lastRouteId} />
            </Component>
          );

          toRender = lastRouteId = aliasedId;
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
        <OutletProvider outlets={routes!}>
          <Outlet key={toRender} id={toRender} />
        </OutletProvider>
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
