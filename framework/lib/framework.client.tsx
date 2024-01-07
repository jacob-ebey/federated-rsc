"use client";

import * as React from "react";

import { createFromReadableStream } from "#react.client";

export type PromiseStreamItem<T> = null | { head: T; tail: PromiseStream<T> };
export type PromiseStream<T> = Promise<PromiseStreamItem<T>>;

export function StreamReader({
  promiseStream,
  cache,
}: {
  promiseStream: PromiseStream<Uint8Array>;
  cache: { current: null | Promise<React.JSX.Element> };
}) {
  const element = React.use(
    (cache.current =
      cache.current ||
      (createFromReadableStream(
        fromPromiseStream(promiseStream)
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
