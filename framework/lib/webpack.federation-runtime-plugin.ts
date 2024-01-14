import type {
	FederationRuntimePlugin,
	Remote,
} from "@module-federation/runtime/types";

declare global {
	// biome-ignore lint/style/noVar: <explanation>
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

for (const remote of federation.initOptions.remotes as Remote[]) {
	if ("entry" in remote && remote.entry?.includes("[public_path]")) {
		remote.entry = publicPath + remote.entry.split("[public_path]")[1];
	}
}

export default function (): FederationRuntimePlugin {
	return {
		name: "rsc-internal-plugin",
	};
}
