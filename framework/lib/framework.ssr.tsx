import * as React from "react";

export async function InlinePayload({
	decoder,
	readable,
}: {
	decoder?: TextDecoder;
	readable: ReadableStreamDefaultReader<Uint8Array>;
}) {
	let initialScript = null;
	if (!decoder) {
		decoder = new TextDecoder();
		initialScript = (
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
				dangerouslySetInnerHTML={{
					__html: `
            window.__RSC__ = {
              encoder: new TextEncoder(),
            };
            __RSC__.stream = new ReadableStream({
              start(controller) {
                __RSC__.controller = controller;
              },
            });
            __RSC__.chunk = (chunk) => {
              __RSC__.controller.enqueue(
                __RSC__.encoder.encode(chunk)
              );
            };
            __RSC__.done = () => {
              __RSC__.controller.close();
              dispatchEvent(
                new CustomEvent("rscdone", {
                  detail: null,
                })
              );
            };
            dispatchEvent(
              new CustomEvent("rscready", {
                detail: null,
              })
            );
          `,
				}}
			/>
		);
	}

	const { done, value } = await readable.read();

	const decoded = value ? decoder.decode(value, { stream: true }) : null;
	const script = decoded ? (
		<script
			// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
			dangerouslySetInnerHTML={{
				__html: `window.__RSC__.chunk(${sanitize(JSON.stringify(decoded))})`,
			}}
		/>
	) : null;

	if (done) {
		return (
			<>
				{initialScript}
				{script}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{ __html: "window.__RSC__.done();" }}
				/>
			</>
		);
	}

	return (
		<>
			{initialScript}
			{script}
			<React.Suspense>
				<InlinePayload decoder={decoder} readable={readable} />
			</React.Suspense>
		</>
	);
}

// Taken from https://github.com/cyco130/vite-rsc/blob/2e3d0ad9915e57c4b2eaa3ea24b46c1b477a4cce/packages/fully-react/src/server/htmlescape.ts#L25C1-L38C2
const TERMINATORS_LOOKUP: Record<string, string> = {
	"\u2028": "\\u2028",
	"\u2029": "\\u2029",
};

const TERMINATORS_REGEX = /[\u2028\u2029]/g;

function sanitizer(match: string | number) {
	return TERMINATORS_LOOKUP[match];
}

export function sanitize(str: string) {
	return str.replace(TERMINATORS_REGEX, sanitizer);
}
