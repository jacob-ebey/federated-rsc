#!/usr/bin/env node

import("../cli/build.mjs")
  .then(({ build }) => build())
  .catch((reason) => {
    console.error(reason);
    process.exit(1);
  });
