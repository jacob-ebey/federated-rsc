import * as React from "react";
import { hydrateRoot } from "react-dom/client";
// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/client";

import {
	INTERNAL_Location,
	type INTERNAL_LocationState,
} from "framework/client";

declare global {
	// biome-ignore lint/style/noVar: <explanation>
	var __RSC__: {
		stream: ReadableStream<Uint8Array>;
	};
	interface Window {
		setLocation: (
			setter: (
				previousLocation: INTERNAL_LocationState,
			) => INTERNAL_LocationState,
		) => void;
	}
}

export function hydrate() {
	if (typeof __RSC__ !== "undefined") {
		hydrateInternal();
		return;
	}
	addEventListener("rscready", hydrateInternal, { once: true });
}

let abortController: AbortController | undefined;

async function hydrateInternal() {
	addEventListener("click", (event) => {
		if (!window.setLocation || event.defaultPrevented) return;

		let target = event.target as HTMLAnchorElement | null;
		if (target?.tagName !== "A") {
			target = target?.closest("a") ?? null;
		}

		if (target?.tagName === "A") {
			const href = target.getAttribute("href");
			if (href?.startsWith("/") && target.getAttribute("target") !== "_self") {
				window.history.pushState({}, "", href);
				const url = new URL(href, window.location.href);
				const newAbortController = new AbortController();
				const fetchPromise = fetch(href, {
					headers: {
						Accept: "text/x-component",
					},
					signal: newAbortController.signal,
				});
				window.setLocation(() => ({
					root: RSD.createFromFetch(fetchPromise, {
						callServer: window.callServer,
					}) as React.Usable<React.ReactElement>,
					url,
				}));
				// TODO: Abort controller in component to avoid aborting it when it's still mounted.
				abortController?.abort();
				abortController = newAbortController;
				event.preventDefault();
			}
		}
	});

	addEventListener("popstate", (event) => {
		if (!window.setLocation) {
			window.location.reload();
			return;
		}

		const url = new URL(window.location.href);
		const newAbortController = new AbortController();
		const fetchPromise = fetch(url.pathname, {
			headers: {
				Accept: "text/x-component",
			},
			signal: newAbortController.signal,
		});
		window.setLocation(() => ({
			root: RSD.createFromFetch(fetchPromise, {
				callServer: window.callServer,
			}) as React.Usable<React.ReactElement>,
			url,
		}));
		abortController?.abort();
		abortController = newAbortController;
		event.preventDefault();
	});

	addEventListener("submit", (event) => {
		if (!window.setLocation || event.defaultPrevented) return;

		const target = event.target as HTMLFormElement;
		const submitter = event.submitter;
		if (target.tagName !== "FORM") {
			return;
		}
		let action = target.getAttribute("action");
		if (submitter?.hasAttribute("formaction")) {
			action = submitter.getAttribute("formaction");
		}
		if (!action?.startsWith("/")) {
			return;
		}

		let method = target.getAttribute("method");
		if (submitter?.hasAttribute("formmethod")) {
			method = submitter.getAttribute("formmethod");
		}
		if (!method) {
			method = "GET";
		} else {
			method = method.toUpperCase();
		}

		let searchParams: URLSearchParams | undefined;
		const formData = new FormData(target, submitter);
		if (method === "GET") {
			searchParams = new URLSearchParams();
			for (const [key, value] of formData) {
				if (typeof value !== "string") {
					throw new Error("Only string values are supported for GET requests");
				}
				searchParams.append(key, value);
			}
		}

		const url = new URL(action, window.location.href);
		if (method === "GET" && searchParams) {
			url.search = searchParams.toString();
		}

		const newAbortController = new AbortController();
		let body: BodyInit | undefined;
		if (!searchParams) {
			body = formData;
		}
		const fetchPromise = fetch(url.pathname + url.search, {
			method,
			body,
			headers: {
				Accept: "text/x-component",
			},
			signal: newAbortController.signal,
		});
		window.setLocation(() => ({
			root: RSD.createFromFetch(fetchPromise, {
				callServer: window.callServer,
			}) as React.Usable<React.ReactElement>,
			url,
		}));
		// TODO: Abort controller in component to avoid aborting it when it's still mounted.
		abortController?.abort();
		abortController = newAbortController;

		event.preventDefault();
	});

	const initialRoot = RSD.createFromReadableStream(__RSC__.stream, {
		callServer: window.callServer,
	}) as React.Usable<React.ReactElement>;
	const initialURL = new URL(window.location.href);

	React.startTransition(() => {
		hydrateRoot(
			document,
			<React.StrictMode>
				<INTERNAL_Location
					getSetLocation={(_setLocation) => {
						window.setLocation = _setLocation;
					}}
					initialRoot={initialRoot}
					initialURL={initialURL}
				/>
			</React.StrictMode>,
		);
	});
}
