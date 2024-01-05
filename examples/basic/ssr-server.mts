import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { handler } from "./dist/ssr/main.js";

const app = new Hono();

app.use("*", (c) => {
  return handler(c.req.raw, "http://localhost:3001");
});

serve(
  {
    ...app,
    port: 3000,
  },
  (info) => {
    console.log(`SSR listening on http://localhost:${info.port}`);
  }
);
