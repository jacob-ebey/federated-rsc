import * as stream from "node:stream";
import * as webStream from "node:stream/web";

// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/client";

export function createFromReadableStream(
	readableStream: webStream.ReadableStream<Uint8Array>,
) {
	return RSD.createFromNodeStream(stream.Readable.fromWeb(readableStream), {
		moduleMap: new Proxy(
			{},
			{
				get(_, id) {
					return new Proxy(
						{},
						{
							get(_, key) {
								return {
									id,
									name: key,
									chunks: [String(id).split("#")[0]],
								};
							},
						},
					);
				},
			},
		),
		moduleLoading: new Proxy(
			{},
			{
				get(_, key) {
					throw new Error("Not implemented");
				},
			},
		),
	});
}

export function registerServerReference(
	proxy: unknown,
	mod: string,
	exp: string,
) {
	return RSD.createServerReference(
		`${mod}#${exp}`,
		typeof window !== "undefined" ? window.callServer : undefined,
	);
}
