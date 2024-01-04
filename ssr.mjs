import { serve } from "@hono/node-server";
import { Hono } from "hono";

const SERVER_ORIGIN = "http://localhost:3001";

const app = new Hono();

app.use()

serve({
  ...app,
  port: 3000,
});
