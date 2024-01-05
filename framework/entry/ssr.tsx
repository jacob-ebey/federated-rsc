import * as stream from "node:stream";

// @ts-expect-error - no types
import RDS from "react-dom/server.node";
// @ts-expect-error - no types
import RSD from "react-server-dom-webpack/client.node";

import { InlinePayload } from "framework/ssr";

export async function handler(request: Request, serverOrigin: string) {
  const url = new URL(request.url);
  const serverUrl = new URL(url.pathname + url.search, serverOrigin);
  const response = await fetch(serverUrl, {
    headers: {
      Accept: "text/x-component",
    },
  });

  if (
    !response.headers.get("Content-Type")?.match(/\btext\/x-component\b/) ||
    !response.body
  ) {
    return new Response(null, {
      status: 500,
    });
  }

  const [payloadA, payloadB] = response.body.tee();

  const root = RSD.createFromNodeStream(
    stream.Readable.fromWeb(payloadA as any),
    {
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
                    chunks: [id],
                  };
                },
              }
            );
          },
        }
      ),
      moduleLoading: new Proxy(
        {},
        {
          get(_, key) {
            throw new Error("WTF Module Loading " + String(key));
          },
        }
      ),
    }
  );

  return new Promise((resolve, reject) => {
    let shellSent = false;
    const { pipe, abort } = RDS.renderToPipeableStream(
      <>
        {root}
        <InlinePayload readable={payloadB.getReader()} />
      </>,
      {
        onShellReady() {
          shellSent = true;
          resolve(
            new Response(
              stream.Readable.toWeb(
                pipe(new stream.PassThrough())
              ) as ReadableStream<Uint8Array>,
              {
                headers: {
                  "Content-Type": "text/html",
                  "Transfer-Encoding": "chunked",
                },
              }
            )
          );
        },
        onShellError(error: Error) {
          if (!shellSent) {
            reject(error);
          }
        },
        onError(error: Error) {
          if (shellSent) return;
          console.error(error);
        },
      }
    );
  });
}
