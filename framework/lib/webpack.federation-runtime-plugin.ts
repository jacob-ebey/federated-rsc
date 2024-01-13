import type {
  FederationRuntimePlugin,
  Remote,
} from "@module-federation/runtime/types";

declare global {
  var __webpack_require__: {
    p: string;
    federation: {
      initOptions: {
        remotes: Remote[];
      };
    };
  };
}

const publicPath = __webpack_require__.p;
const federation = __webpack_require__.federation;

(federation.initOptions.remotes as Remote[]).forEach((remote) => {
  if (
    "entry" in remote &&
    remote.entry &&
    remote.entry.includes("[public_path]")
  ) {
    remote.entry = publicPath + remote.entry.split("[public_path]")[1];
  }
});

export default function (): FederationRuntimePlugin {
  return {
    name: "rsc-internal-plugin",
  };
}
