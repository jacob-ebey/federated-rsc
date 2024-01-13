import * as React from "react";
import RSD from "react-server-dom-webpack/client";

declare global {
  interface Window {
    callServer: (id: string) => Promise<void>;
  }
}

export function createFromReadableStream(
  readableStream: ReadableStream<Uint8Array>
) {
  return RSD.createFromReadableStream(readableStream, {
    callServer: window.callServer,
  });
}
