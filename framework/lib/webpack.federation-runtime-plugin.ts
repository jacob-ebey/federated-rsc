import { Module } from "@module-federation/runtime/dist/src/module/index.js";
import type {
	FederationRuntimePlugin,
	Remote,
	RemoteEntryExports,
	ShareScopeMap,
} from "@module-federation/runtime/types";

declare global {
	// biome-ignore lint/style/noVar: <explanation>
	var __webpack_require__: ((id: string) => unknown) & {
		c: Record<string, { exports?: unknown; promise?: Promise<Module> }>;
		e: (chunkId: string | number) => Promise<unknown>;
		p: string;
		S: ShareScopeMap;
		federation: {
			initOptions: {
				name: string;
				remotes: Remote[];
			};
		};
	};

	// biome-ignore lint/style/noVar: <explanation>
	var ___REMOTES___: Record<string, string>;
}

const publicPath = __webpack_require__.p;
const federation = __webpack_require__.federation;
const cache = __webpack_require__.c;
const shareScopeMap = __webpack_require__.S;
const webpackRequire = __webpack_require__;

for (const [remote, external] of Object.entries(___REMOTES___)) {
	if (!federation.initOptions.remotes.find((r) => r.name === remote)) {
		federation.initOptions.remotes.push({
			name: remote,
			alias: remote,
			entry: external,
			version: "latest",
			type: "global",
			entryGlobalName: remote,
		});
	}
}

for (const remote of federation.initOptions.remotes as Remote[]) {
	if ("entry" in remote && remote.entry?.includes("[public_path]")) {
		remote.entry = publicPath + remote.entry.split("[public_path]")[1];
	}
}

const gs = (globalThis ||
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	new Function("return globalThis")()) as unknown as Record<string, any>;

const prefix = /^rsc\/remote\/(client|server)\//;
const ogEnsureChunk = __webpack_require__.e;
const containerLoadCache =
	gs.containerLoadCache ||
	// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
	(gs.containerLoadCache = new Map<string, Promise<RemoteEntryExports>>());

const containerExposedModuleCache =
	gs.containerExposedModuleCache ||
	// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
	(gs.containerExposedModuleCache = new Map<string, Promise<unknown>>());

function rscFederationEnsureChunk(chunkId: string): Promise<unknown> {
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	if (cache[chunkId]) return cache[chunkId].promise!;
	const idToSet = chunkId;
	cache[chunkId] = {
		promise: (async () => {
			await new Promise((r) => setTimeout(r, 0));

			const [remoteId, exposedModuleRequest] = idToSet.split(":");
			const containerName = remoteId.replace(prefix, "");
			const exposedModuleCacheId = `${containerName}/${exposedModuleRequest}`;

			const referenceId = `webpack/container/reference/${containerName}`;

			let containerPromise = containerLoadCache.get(referenceId);
			if (!containerPromise) {
				containerPromise = ogEnsureChunk(remoteId).then(async () => {
					const container = (await webpackRequire(
						referenceId,
					)) as RemoteEntryExports & {
						inited?: boolean;
					};

					if (!gs[containerName]) {
						gs[containerName] = container;
					}

					if (!container.inited) {
						await container.init(
							__FEDERATION__.__INSTANCES__[0].shareScopeMap.default,
						);
					}

					return container;
				});
				containerLoadCache.set(referenceId, containerPromise);
			}
			const container = await containerPromise;

			let modPromise = containerExposedModuleCache.get(exposedModuleCacheId);
			if (!modPromise) {
				modPromise = (async () => {
					const factory = await container.get(exposedModuleRequest);
					const mod = await factory();
					cache[idToSet].exports = mod;
					return mod;
				})();
				containerExposedModuleCache.set(exposedModuleCacheId, modPromise);
			}
			return modPromise;
		})(),
	};

	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	return cache[chunkId].promise!;
}

__webpack_require__.e = async (chunkId: string | number) => {
	if (
		typeof chunkId === "string" &&
		prefix.test(chunkId) &&
		chunkId.includes(":")
	) {
		if (cache[chunkId]) return cache[chunkId].promise;
		return rscFederationEnsureChunk(chunkId);
	}
	return ogEnsureChunk(chunkId);
};

export default function (): FederationRuntimePlugin {
	return {
		name: "rsc-internal-plugin",
	};
}
