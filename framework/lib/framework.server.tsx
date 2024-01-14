import * as React from "react";

import {
	type AgnosticDataRouteObject,
	type Params,
	createStaticHandler,
} from "@remix-run/router";

import { INTERNAL_SeverContextProvider, type RouteProps } from "framework";
import { INTERNAL_Outlet, INTERNAL_OutletProvider } from "framework/client";
import { renderToReadableStream } from "framework/react.server";

declare global {
	// biome-ignore lint/style/noVar: <explanation>
	var ___CONTAINER_NAME___: string;
}

export function createRequestHandler(routes: AgnosticDataRouteObject[]) {
	return async (request: Request) => {
		const handler = createStaticRequestHandler(routes);

		try {
			const context = await handler(request);

			if (context instanceof Response) {
				return context;
			}

			const body = renderToReadableStream(
				context.root,
				new Proxy(
					{},
					{
						get(_, prop, __) {
							const [___, ...exposedRest] = String(prop).split(":");
							const [____, ...exportedRest] = exposedRest.join(":").split("#");
							const exported = exportedRest.join("#");

							return {
								id: prop,
								name: exported,
								chunks: [prop],
								async: true,
							};
						},
					},
				),
				{
					identifierPrefix: Date.now().toString(36),
					signal: request.signal,
					onError(error: Error) {
						if (request.signal.aborted) return;
						console.error(error);
					},
				},
			);

			return new Response(body, {
				status: context.status,
				headers: context.headers,
			});
		} catch (reason) {
			console.error(reason);
			return new Response("Internal Server Error", {
				status: 500,
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					Vary: "Accept",
				},
			});
		}
	};
}

export function createStaticRequestHandler(routes: AgnosticDataRouteObject[]) {
	const handler = createStaticHandler(routes, {
		future: { v7_relativeSplatPath: true },
	});

	return async (request: Request) => {
		const context = await handler.query(request);
		if (context instanceof Response) {
			// TODO: re-write redirects
			return context;
		}

		const matches = context.matches as Array<
			(typeof context.matches)[number] & {
				route: {
					Component?: React.FunctionComponent<RouteProps>;
				};
			}
		>;

		let lastRouteId = "!";
		let toRender: React.ReactElement | string | null = null;
		const routes: Record<string, React.ReactElement> = {};

		for (let i = matches.length - 1; i >= 0; i--) {
			const {
				params,
				route: { Component, id },
			} = matches[i];
			if (Component) {
				const aliasedId = `${___CONTAINER_NAME___}/${id}`;

				routes[aliasedId] = (
					<Component params={params}>
						<INTERNAL_Outlet key={lastRouteId} id={lastRouteId} />
					</Component>
				);

				toRender = lastRouteId = aliasedId;
			}
		}

		if (!toRender) {
			return new Response("Not Found", {
				status: 404,
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					Vary: "Accept",
				},
			});
		}

		let root: React.ReactElement;
		if (typeof toRender === "string") {
			root = (
				<INTERNAL_OutletProvider outlets={routes}>
					<INTERNAL_Outlet key={toRender} id={toRender} />
				</INTERNAL_OutletProvider>
			);
		} else {
			root = toRender;
		}

		// TODO: Plumb through an appContext for the "adapter" layer to provide context to the app through getAppContext()
		root = (
			<INTERNAL_SeverContextProvider request={request}>
				{root}
			</INTERNAL_SeverContextProvider>
		);

		return {
			root,
			status: context.statusCode,
			headers: new Headers({
				"Content-Type": "text/x-component; charset=utf-8",
				"Transfer-Encoding": "chunked",
				Vary: "Accept",
			}),
		};
	};
}
