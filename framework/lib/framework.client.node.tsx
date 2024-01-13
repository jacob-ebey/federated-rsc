import * as stream from "node:stream";
import * as webStream from "node:stream/web";

import RSD from "react-server-dom-webpack/client";

export function createFromReadableStream(
  readableStream: webStream.ReadableStream<Uint8Array>
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
  });
}
