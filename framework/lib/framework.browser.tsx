import * as React from "react";
import { hydrateRoot } from "react-dom/client";
// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/client.browser";

declare global {
  var __RSC__: {
    stream: ReadableStream<Uint8Array>;
  };
}

export function hydrate() {
  if (typeof __RSC__ !== "undefined") {
    hydrateInternal();
    return;
  }
  addEventListener("rscready", hydrateInternal, { once: true });
}

async function hydrateInternal() {
  const root = RSD.createFromReadableStream(__RSC__.stream);
  React.startTransition(() => {
    hydrateRoot(document, root);
  });
}
