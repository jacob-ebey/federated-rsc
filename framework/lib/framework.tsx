import { type Params } from "@remix-run/router";
import * as React from "react";

import {
	INTERNAL_StreamReader,
	type PromiseStream,
	type PromiseStreamItem,
} from "framework/client.internal";

export { Params };

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
	const { request } = serverContextRef.current;

	const headers = new Headers(request.headers);
	headers.set("Accept", "text/x-component");
	headers.delete("host");
	headers.set(
		"X-Forwarded-For-Host",
		request.headers.get("X-Forwarded-For-Host") ??
			request.headers.get("host") ??
			"",
	);

	const response = await fetch(
		new Request(url, {
			body: request.body,
			headers,
			method: request.method,
			signal: request.signal,
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
	appContext?: AppContext;
	request: Request;
}

const INTERNAL_getServerContextRef = React.cache(
	(): { current?: ServerContext } => ({}),
);
export function INTERNAL_SeverContextProvider({
	appContext,
	children,
	request,
}: {
	appContext?: AppContext;
	children: React.ReactNode;
	request: Request;
}) {
	const serverContextRef = INTERNAL_getServerContextRef();
	const serverContext: ServerContext = {
		appContext,
		request,
	};
	serverContextRef.current = serverContext;

	return children;
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
