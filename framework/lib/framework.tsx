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
    >
      {children}
    </StreamReader>
  );
}
