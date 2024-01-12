import * as React from "react";
// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/client";

declare global {
  interface Window {
    callServer: (id: string) => Promise<unknown>;
  }
}

export function createFromReadableStream(
  readableStream: ReadableStream<Uint8Array>
) {
  return RSD.createFromReadableStream(readableStream, {
    callServer: window.callServer,
  });
}

export function registerServerReference(
  proxy: unknown,
  mod: string,
  exp: string
) {
  return RSD.createServerReference(
    mod + "#" + exp,
    typeof "window" !== "undefined" ? window.callServer : undefined
  );
}
