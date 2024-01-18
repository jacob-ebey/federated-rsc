import * as React from "react";
// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/client";

declare global {
	interface Window {
		callServer: (id: string, args: unknown[]) => Promise<unknown>;
	}
}

export function createFromReadableStream(
	readableStream: ReadableStream<Uint8Array>,
) {
	return RSD.createFromReadableStream(readableStream, {
		callServer: (id: string, args: unknown[]) => window.callServer(id, args),
	});
}

export function registerServerReference(
	proxy: unknown,
	mod: string,
	exp: string,
) {
	return RSD.createServerReference(
		`${mod}#${exp}`,
		(id: string, args: unknown[]) => window.callServer(id, args),
	);
}
