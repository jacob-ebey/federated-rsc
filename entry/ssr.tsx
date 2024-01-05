import * as stream from "node:stream";

import * as React from "react";
import RDS from "react-dom/server.node";
import RSD from "react-server-dom-webpack/client.node";

// TODO: Make this a build time thing
const SERVER_ORIGIN = "http://localhost:3001";

export async function handler(request: Request) {
  const url = new URL(request.url);
  const serverUrl = new URL(url.pathname + url.search, SERVER_ORIGIN);
  const response = await fetch(serverUrl);

  if (
    !response.headers.get("Content-Type")?.match(/\btext\/x-component\b/) ||
    !response.body
  ) {
    return new Response(null, {
      status: 500,
    });
  }

  const root = RSD.createFromNodeStream(
    stream.Readable.fromWeb(response.body as any),
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
            // throw new Error("WTF Manifest " + String(key));
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
    const { pipe, abort } = RDS.renderToPipeableStream(root, {
      onShellReady() {
        shellSent = true;
        resolve(
          new Response(stream.Readable.toWeb(pipe(new stream.PassThrough())), {
            headers: {
              "Content-Type": "text/html",
              "Transfer-Encoding": "chunked",
            },
          })
        );
      },
      onShellError(error) {
        if (!shellSent) {
          reject(error);
        }
      },
      onError(error) {
        if (shellSent) return;
        console.error(error);
      },
    });
  });
}
