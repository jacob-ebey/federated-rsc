// @ts-expect-error - no types
import RSDC from "react-server-dom-webpack/client";

import { hydrate } from "framework/browser";

window.callServer = async function callServer(id, args) {
	const body = await RSDC.encodeReply(args);
	const fetchPromise = fetch(window.location.href, {
		body: body,
		headers: {
			Accept: "text/x-component",
			"RSC-Action": id,
		},
		method: "POST",
	});

	await fetchPromise;

	window.setLocation(({ url }) => ({
		root: RSDC.createFromFetch(fetchPromise, {
			callServer: (id: string, args: unknown[]) => window.callServer(id, args),
		}),
		url,
	}));
};

hydrate();
