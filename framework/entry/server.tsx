import { createRequestHandler } from "framework/server";

import { routes } from "#routes";

export const handler = createRequestHandler(routes);
