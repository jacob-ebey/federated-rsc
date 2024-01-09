import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { handler } from "./dist/server/main.js";

const app = new Hono();

app.use(
  "/dist/browser/*",
  cors({ origin: "*", allowMethods: ["HEAD", "GET"] }),
  serveStatic()
);
app.use("/dist/ssr/*", serveStatic());

app.all("*", async (c) => {
  return handler(c.req.raw);
});

serve(
  {
    ...app,
    port: 3001,
  },
  (info) => {
    console.log(`RSC listening on http://localhost:${info.port}`);
  }
);
