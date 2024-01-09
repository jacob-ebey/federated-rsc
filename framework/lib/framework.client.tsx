"use client";

import * as React from "react";

import { createFromReadableStream } from "framework/react.client";

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

const outletContext = React.createContext<null | Record<
  string,
  React.ReactNode
>>(null);

export function Outlet({ id }: { id: string }) {
  const context = React.useContext(outletContext);
  if (!context) throw new Error("No router context found");
  return context[id] ?? null;
}

export interface OutletProviderProps {
  children: React.ReactNode;
  outlets: Record<string, React.ReactNode>;
}

export function OutletProvider({ children, outlets }: OutletProviderProps) {
  return (
    <outletContext.Provider value={outlets}>{children}</outletContext.Provider>
  );
}

export type PromiseStreamItem<T> = null | { head: T; tail: PromiseStream<T> };
export type PromiseStream<T> = Promise<PromiseStreamItem<T>>;

export function StreamReader({
  cache,
  children,
  promiseStream,
}: {
  cache: { current: null | Promise<React.JSX.Element> };
  children?: React.ReactNode;
  promiseStream: PromiseStream<string>;
}) {
  const element = React.use<
    React.ReactElement<OutletProviderProps, typeof OutletProvider>
  >(
    (cache.current =
      cache.current ||
      createFromReadableStream(
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
      ))
  );

  if (!element?.props?.outlets) throw new Error("No outlets found");

  return React.useMemo(() => {
    return React.cloneElement(element, {
      ...element.props,
      outlets: {
        ...element.props.outlets,
        ["!"]: children,
      },
    });
  }, [element, children]);
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
