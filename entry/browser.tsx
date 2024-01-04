import * as React from "react";
import { createRoot } from "react-dom/client";
import RSD from "react-server-dom-webpack/client.browser";

// const req = __webpack_require__;
// const load = __webpack_chunk_load__;
// console.log({ req, load });
// import("client_modules/app/components/counter.tsx");

const STATIC_RSC =
  `1:I["rsc/remote/client/client_modules:./app/components/counter.tsx",["rsc/remote/client/client_modules:./app/components/counter.tsx"],"Counter",1]\n` +
  `0:["$","html",null,{"children":[["$","head",null,{"children":["$","title",null,{"children":"My App"}]}],["$","body",null,{"children":[["$","h1",null,{"children":"Hello Index"}],["$","$L1",null,{}]]}]]}]\n`;

const root = RSD.createFromReadableStream(
  new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(STATIC_RSC));
      controller.close();
    },
  }),
  document.getElementById("root")
);

React.startTransition(() => {
  createRoot(document).render(root);
});
