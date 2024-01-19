// @ts-expect-error - no types
import RSDC from "react-server-dom-webpack/client";

import { hydrate } from "framework/browser";

window.callServer = async function callServer(id, args) {
	const body = await RSDC.encodeReply(args);
	const headerName =
		typeof args[0] === "object" &&
		args.length === 1 &&
		args[0] instanceof FormData
			? "Form-Action"
			: "RSC-Action";

	const fetchPromise = fetch(window.location.href, {
		body: body,
		headers: {
			Accept: "text/x-component",
			[headerName]: id,
		},
		method: "POST",
	});

	let response = RSDC.createFromFetch(fetchPromise, {
		callServer: (id: string, args: unknown[]) => window.callServer(id, args),
	});

	if (headerName === "Form-Action") {
		window.setLocation?.(({ url }) => ({
			root: response,
			url,
		}));
		return undefined;
	}

	response = await response;

	if (response.error) {
		throw response.error;
	}

	return response.result;
};

hydrate();
