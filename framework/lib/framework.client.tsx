"use client";

import * as React from "react";

import { createFromReadableStream } from "framework/react.client";

interface RouterContext {
  routes: Record<string, React.ReactElement>;
}

export interface LocationState {
  root: React.Usable<React.ReactElement>;
  url: URL;
}

export function Location({
  getSetLocation,
  initialRoot,
  initialURL,
}: {
  getSetLocation: (setLocation: (location: LocationState) => void) => void;
  initialRoot: React.Usable<React.ReactElement>;
  initialURL: URL;
}) {
  const [location, _setLocation] = React.useState<LocationState>({
    root: initialRoot,
    url: initialURL,
  });
  if (getSetLocation) getSetLocation(_setLocation);

  return React.use(location.root) as React.JSX.Element;
}

const routerContext = React.createContext<null | RouterContext>(null);

export function Route({ id }: { id: string }) {
  const context = React.useContext(routerContext);
  if (!context) throw new Error("No router context found");
  return context.routes[id] || null;
}

export function Router({
  children,
  routes,
}: {
  children: React.ReactNode;
  routes: Record<string, React.ReactElement>;
}) {
  return (
    <routerContext.Provider value={{ routes }}>
      {children}
    </routerContext.Provider>
  );
}

export type PromiseStreamItem<T> = null | { head: T; tail: PromiseStream<T> };
export type PromiseStream<T> = Promise<PromiseStreamItem<T>>;

export function StreamReader({
  promiseStream,
  cache,
}: {
  promiseStream: PromiseStream<string>;
  cache: { current: null | Promise<React.JSX.Element> };
}) {
  const element = React.use(
    (cache.current =
      cache.current ||
      (createFromReadableStream(
        fromPromiseStream(promiseStream).pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              // base64 string -> Uint8Array
              controller.enqueue(
                new Uint8Array(
                  atob(chunk as string)
                    .split("")
                    .map((c) => c.charCodeAt(0))
                )
              );
            },
          })
        )
      ) as Promise<React.JSX.Element>))
  );

  return element;
}

function fromPromiseStream<T = any>(promise: PromiseStream<T>) {
  return new ReadableStream<T>({
    async start(controller) {
      async function go(current: PromiseStream<T>) {
        const item = await current;
        if (item) {
          controller.enqueue(item.head);
          return go(item.tail);
        } else {
          controller.close();
        }
      }
      return go(promise);
    },
  });
}
