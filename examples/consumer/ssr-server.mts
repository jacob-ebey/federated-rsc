import dns from "node:dns";

import { serve } from "@hono/node-server";
import { Hono } from "hono";

import ssr from "./dist/ssr/main.js";

dns.setDefaultResultOrder("ipv4first");

const app = new Hono();

app.use("/about", (c) => {
  return ssr.handler(c.req.raw, "http://localhost:3001", [
    "http://localhost:4001/dist/browser/main.js",
  ]);
});

app.use("*", (c) => {
  return ssr.handler(c.req.raw, "http://localhost:4001", [
    "http://localhost:4001/dist/browser/main.js",
  ]);
});

serve(
  {
    ...app,
    port: 4000,
  },
  (info) => {
    console.log(`SSR listening on http://localhost:${info.port}`);
  }
);
