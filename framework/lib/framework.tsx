import * as React from "react";

import {
  createStaticHandler,
  type AgnosticDataRouteObject,
  type Params,
} from "@remix-run/router";

import {
  StreamReader,
  type PromiseStream,
  type PromiseStreamItem,
} from "framework/client";

export { Params };

export interface ServerComponentProps {
  url: string | URL;
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

    let root = null;
    for (let i = matches.length - 1; i >= 0; i--) {
      const {
        params,
        route: { Component },
      } = matches[i];
      if (Component) {
        root = React.createElement(Component, { params, children: root }, root);
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

function toPromiseStream<T = any>(input: ReadableStream<T>): PromiseStream<T> {
  const reader = input.getReader();
  async function go(): Promise<PromiseStreamItem<T>> {
    const { done, value: chunk } = await reader.read();
    if (done) {
      return null;
    } else {
      return { head: chunk, tail: go() };
    }
  }
  return go();
}

export async function ServerComponent({ url }: { url: string | URL }) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/x-component",
    },
  });

  if (!response.headers.get("Content-Type")?.match(/\btext\/x-component\b/)) {
    throw new Error(
      `Expected a text/x-component, but received ${response.headers.get(
        "Content-Type"
      )}`
    );
  }

  if (!response.body) {
    throw new Error("Expected a body");
  }
  return (
    <StreamReader
      cache={{ current: null }}
      promiseStream={toPromiseStream(
        response.body.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              controller.enqueue(
                btoa(String.fromCharCode(...new Uint8Array(chunk))) + "\n"
              );
            },
          })
        )
      )}
    />
  );
}
