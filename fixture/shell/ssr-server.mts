import dns from "node:dns";

import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { handler } from "./dist/ssr/main.js";

dns.setDefaultResultOrder("ipv4first");

const app = new Hono();

app.use("*", (c) => {
	return handler(
		c.req.raw,
		"http://localhost:3001",
		["http://localhost:3001/dist/browser/main.js"],
		{
			_fixture_marketing: "http://localhost:4001",
		},
	);
});

serve(
	{
		...app,
		port: 3000,
	},
	(info) => {
		console.log(`SSR listening on http://localhost:${info.port}`);
	},
);
