import dns from "node:dns";

import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { handler } from "./dist/ssr/main.js";

dns.setDefaultResultOrder("ipv4first");

const app = new Hono();

app.use("/", (c) => {
	return handler(c.req.raw, "http://localhost:4001", [
		"http://localhost:4001/dist/browser/main.js",
	]);
});
app.use("/about/*", (c) => {
	return handler(c.req.raw, "http://localhost:4001", [
		"http://localhost:4001/dist/browser/main.js",
	]);
});

app.use("*", (c) => {
	return handler(c.req.raw, "http://localhost:3001", [
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
	},
);
