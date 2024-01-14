import { cache } from "react";
import { type Params } from "@remix-run/router";

import {
  StreamReader,
  type PromiseStream,
  type PromiseStreamItem,
} from "framework/client";

export { Params };

export interface ServerComponentProps {
  url: string | URL;
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

export async function RSCFrame({
  children,
  url,
}: {
  children?: React.ReactNode;
  url: string | URL;
}) {
  const serverContextRef = INTERNAL_getServerContextRef();
  if (!serverContextRef.current) {
    throw new Error("No server context found");
  }
  const { request } = serverContextRef.current;

  const headers = new Headers(request.headers);
  headers.set("Accept", "text/x-component");
  headers.set("X-Forwarded-For", request.url);

  const response = await fetch(
    new Request(url, {
      body: request.body,
      headers,
      method: request.method,
      signal: request.signal,
      window: null,
    })
  );

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
    >
      {children}
    </StreamReader>
  );
}

export type AppContext = unknown;

interface ServerContext {
  appContext?: AppContext;
  request: Request;
}

const INTERNAL_getServerContextRef = cache(
  (): { current?: ServerContext } => ({})
);
export function INTERNAL_SeverContextProvider({
  appContext,
  children,
  request,
}: {
  appContext?: AppContext;
  children: React.ReactNode;
  request: Request;
}) {
  const serverContextRef = INTERNAL_getServerContextRef();
  const serverContext: ServerContext = {
    appContext,
    request,
  };
  serverContextRef.current = serverContext;

  return children;
}

export function getURL(): URL {
  const serverContextRef = INTERNAL_getServerContextRef();
  if (!serverContextRef.current) {
    throw new Error("No server context found");
  }
  return new URL(serverContextRef.current.request.url);
}

export function getHeaders(): Headers {
  const serverContextRef = INTERNAL_getServerContextRef();
  if (!serverContextRef.current) {
    throw new Error("No server context found");
  }
  return new Headers(serverContextRef.current.request.headers);
}

export function getAppContext(): AppContext {
  const serverContextRef = INTERNAL_getServerContextRef();
  if (!serverContextRef.current) {
    throw new Error("No server context found");
  }
  return serverContextRef.current.appContext;
}
