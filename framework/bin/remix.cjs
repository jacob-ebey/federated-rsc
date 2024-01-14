#!/usr/bin/env node

import("../cli/build.mjs")
	.then(({ build }) => build())
	.catch((reason) => {
		if (process.env.DEBUG) {
			console.error(reason);
		}
		process.exit(1);
	});
