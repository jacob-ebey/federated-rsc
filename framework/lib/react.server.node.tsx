import * as stream from "node:stream";

// @ts-expect-error - no types
import RSDS from "react-server-dom-webpack/server";

export function renderToReadableStream(
	root: React.ReactNode,
	manifest?: unknown,
	options?: { signal?: AbortSignal; onPostpone?: (...args: unknown[]) => void },
) {
	const { signal, ...sharedOptions } = options ?? {};
	const { pipe, abort } = RSDS.renderToPipeableStream(
		root,
		manifest,
		sharedOptions,
	);

	signal?.addEventListener("abort", abort, { once: true });

	return stream.Readable.toWeb(
		pipe(new stream.PassThrough()),
	) as ReadableStream<Uint8Array>;
}

export const registerServerReference = RSDS.registerServerReference;

export const registerClientReference = RSDS.registerClientReference;
