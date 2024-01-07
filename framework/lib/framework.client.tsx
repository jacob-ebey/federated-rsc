"use client";

import * as React from "react";

import { createFromReadableStream } from "#react.client";

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
        fromPromiseStream(promiseStream).pipeThrough(createBase64DecodeStream())
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function createBase64DecodeStream() {
  return new TransformStream<string, Uint8Array>({
    async transform(chunk, controller) {
      const result = await base64ToBufferAsync(chunk);
      controller.enqueue(result);
    },
  });
}

function base64ToBufferAsync(base64: string) {
  // I'm lazy, okay
  const dataUrl = "data:application/octet-binary;base64," + base64;
  return fetch(dataUrl)
    .then((res) => res.arrayBuffer())
    .then((buffer) => new Uint8Array(buffer));
}
