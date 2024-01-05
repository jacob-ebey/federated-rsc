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
  }
  addEventListener("rscready", hydrateInternal, { once: true });
}

async function hydrateInternal() {
  const root = RSD.createFromReadableStream(__RSC__.stream);

  const tree = await root;
  React.startTransition(() => {
    hydrateRoot(document, tree[0]);
  });
}
