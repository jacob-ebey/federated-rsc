import * as dns from "node:dns";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";

import { handler } from "./dist/server/main.js";

dns.setDefaultResultOrder("ipv4first");

const app = new Hono();

app.use(
	"/dist/server/*.css",
	cors({ origin: "*", allowMethods: ["HEAD", "GET"] }),
	compress(),
	// artificial delay to simulate network latency
	async (c, next) => {
		await new Promise((r) => setTimeout(r, 100));
		next();
	},
	serveStatic(),
);
app.use(
	"/dist/browser/*",
	cors({ origin: "*", allowMethods: ["HEAD", "GET"] }),
	compress(),
	serveStatic(),
);
app.use("/dist/ssr/*", serveStatic());

app.all("*", async (c) => {
	return handler(c.req.raw);
});

serve(
	{
		...app,
		port: 4001,
	},
	(info) => {
		console.log(`RSC listening on http://localhost:${info.port}`);
	},
);
