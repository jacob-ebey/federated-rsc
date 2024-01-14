import {
	INTERNAL_Location,
	type INTERNAL_LocationState,
} from "framework/client";
import * as React from "react";
import { hydrateRoot } from "react-dom/client";
// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/client";

declare global {
	// biome-ignore lint/style/noVar: <explanation>
	var __RSC__: {
		stream: ReadableStream<Uint8Array>;
	};
}

export function hydrate() {
	if (typeof __RSC__ !== "undefined") {
		hydrateInternal();
		return;
	}
	addEventListener("rscready", hydrateInternal, { once: true });
}

let setLocation: (location: INTERNAL_LocationState) => void;
let abortController: AbortController | undefined;

async function hydrateInternal() {
	addEventListener("click", (event) => {
		if (!setLocation) return;

		const target = event.target as HTMLElement;
		if (target.tagName === "A") {
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
				React.startTransition(() => {
					setLocation({
						root: RSD.createFromFetch(fetchPromise, {
							callServer: window.callServer,
						}) as React.Usable<React.ReactElement>,
						url,
					});
					// TODO: Abort controller in component to avoid aborting it when it's still mounted.
					abortController?.abort();
					abortController = newAbortController;
				});
				event.preventDefault();
			}
		}
	});

	addEventListener("popstate", (event) => {
		if (!setLocation) {
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
		React.startTransition(() => {
			setLocation({
				root: RSD.createFromFetch(fetchPromise, {
					callServer: window.callServer,
				}) as React.Usable<React.ReactElement>,
				url,
			});
			abortController?.abort();
			abortController = newAbortController;
		});
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
						setLocation = _setLocation;
					}}
					initialRoot={initialRoot}
					initialURL={initialURL}
				/>
			</React.StrictMode>,
		);
	});
}
