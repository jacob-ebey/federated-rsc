import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { handler } from "./dist/ssr/main.js";

const app = new Hono();

app.use("*", async (c) => {
  return (await handler)(c.req.raw, "http://localhost:3001");
});

serve({
  ...app,
  port: 3000,
});
