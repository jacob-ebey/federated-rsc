import * as React from "react";
import { createRoot } from "react-dom/client";
import RSD from "react-server-dom-webpack/client.browser";

export function hydrate() {
  if (window.__RSC__) {
    hydrateInternal();
  }
  window.addEventListener("rscready", hydrateInternal);
}

async function hydrateInternal() {
  const root = RSD.createFromReadableStream(__RSC__.stream);

  const tree = await root;
  React.startTransition(() => {
    createRoot(document).render(tree[0]);
  });
}
