import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { handler } from "./dist/ssr/main.js";

const app = new Hono();

app.use("*", async (c) => (await handler)(c.req.raw));

serve({
  ...app,
  port: 3000,
});
