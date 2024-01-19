import { type Params } from "@remix-run/router";
import * as React from "react";
// @ts-expect-error - no types
import RSDS from "react-server-dom-webpack/server";

import {
	INTERNAL_StreamReader,
	Link,
	type PromiseStream,
	type PromiseStreamItem,
} from "framework/client.internal";

export { Link, Params };

export interface RouteProps<Param extends string = never> {
	params: Params<Param>;
	children: React.ReactNode;
}

function toPromiseStream<T = unknown>(
	input: ReadableStream<T>,
): PromiseStream<T> {
	const reader = input.getReader();
	async function go(): Promise<PromiseStreamItem<T>> {
		const { done, value: chunk } = await reader.read();
		if (done) {
			return null;
		}
		return { head: chunk, tail: go() };
	}
	return go();
}

export async function RSCFrame({
	children,
	url,
}: {
	children?: React.ReactNode;
	url: string | URL;
}) {
	const serverContextRef = INTERNAL_getServerContextRef();
	if (!serverContextRef.current) {
		throw new Error("No server context found");
	}
	const { actionResult, request } = serverContextRef.current;

	const headers = new Headers(request.headers);
	headers.set("Accept", "text/x-component");
	headers.delete("host");
	headers.set(
		"X-Forwarded-For-Host",
		request.headers.get("X-Forwarded-For-Host") ??
			request.headers.get("host") ??
			"",
	);

	let method = request.method;
	let body = request.body;
	if (actionResult) {
		method = "GET";
		body = null;
		headers.delete("Form-Action");
	}

	const response = await fetch(
		new Request(url, {
			body,
			headers,
			method,
			signal: request.signal,
			// @ts-expect-error - no types
			duplex: "half",
			window: null,
		}),
	);

	if (!response.headers.get("Content-Type")?.match(/\btext\/x-component\b/)) {
		throw new Error(
			`Expected a text/x-component, but received ${response.headers.get(
				"Content-Type",
			)}`,
		);
	}

	if (!response.body) {
		throw new Error("Expected a body");
	}
	return (
		<INTERNAL_StreamReader
			cache={{ current: null }}
			promiseStream={toPromiseStream(
				response.body.pipeThrough(
					new TransformStream({
						transform(chunk, controller) {
							controller.enqueue(
								`${btoa(String.fromCharCode(...new Uint8Array(chunk)))}\n`,
							);
						},
					}),
				),
			)}
		>
			{children}
		</INTERNAL_StreamReader>
	);
}

export type AppContext = unknown;

interface ServerContext {
	actionResult: ActionResult;
	appContext: AppContext;
	request: Request;
}

export type ActionResult =
	| null
	| { id: string; result: unknown }
	| { id: string; error: unknown };

const INTERNAL_getServerContextRef = React.cache(
	(): { current?: ServerContext } => ({}),
);
// @ts-expect-error - idk what this is about
export async function INTERNAL_SeverContextProvider({
	appContext,
	children,
	request,
}: {
	appContext?: AppContext;
	children: React.ReactNode;
	request: Request;
}) {
	const actionId = request.headers.get("Form-Action");
	let actionResult: null | ActionResult = null;
	if (actionId) {
		let action: undefined | ((...args: unknown[]) => unknown) = undefined;
		try {
			const [moduleId, ...exportNameRest] = actionId.split("#");
			const exportName = exportNameRest.join("#");
			await __webpack_require__.e(moduleId);
			// @ts-expect-error
			action = __webpack_require__(moduleId)[exportName];
		} catch (error) {}
		if (action) {
			const body = request.headers
				.get("Content-Type")
				?.match(/\bmultipart\/form\-data\b/)
				? await request.formData()
				: await request.text();
			const reply = await RSDS.decodeReply(body, {});
			try {
				const result = await action(...reply);
				actionResult = { id: actionId, result };
			} catch (error) {
				actionResult = { id: actionId, error };
			}
		}
	}

	console.log({ actionResult });

	const serverContextRef = INTERNAL_getServerContextRef();
	const serverContext: ServerContext = {
		actionResult,
		appContext,
		request,
	};
	serverContextRef.current = serverContext;

	return children;
}

export function getActionResult(action: unknown): ActionResult {
	const serverContextRef = INTERNAL_getServerContextRef();
	if (!serverContextRef.current) {
		throw new Error("No server context found");
	}
	const _action = action as { $$id?: string };
	if (typeof action !== "function" || !_action?.$$id) {
		throw new Error("Expected a `use server` action");
	}
	const result = serverContextRef.current.actionResult;
	if (!result || result.id !== _action.$$id) {
		return null;
	}
	return result;
}

export function getURL(): URL {
	const serverContextRef = INTERNAL_getServerContextRef();
	if (!serverContextRef.current) {
		throw new Error("No server context found");
	}
	return new URL(serverContextRef.current.request.url);
}

export function getHeaders(): Headers {
	const serverContextRef = INTERNAL_getServerContextRef();
	if (!serverContextRef.current) {
		throw new Error("No server context found");
	}
	return new Headers(serverContextRef.current.request.headers);
}

export function getAppContext(): AppContext {
	const serverContextRef = INTERNAL_getServerContextRef();
	if (!serverContextRef.current) {
		throw new Error("No server context found");
	}
	return serverContextRef.current.appContext;
}
