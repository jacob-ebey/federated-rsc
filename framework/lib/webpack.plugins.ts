import { ModuleFederationPlugin } from "@module-federation/enhanced";
import { rscClientPlugin, rscServerPlugin } from "unplugin-rsc";
import type * as webpack from "webpack";

import { exposedNameFromResource } from "./utils";

export class ServerRSCPlugin {
	constructor(
		private options: {
			clientModules: Set<string>;
			containerName: string;
			cwd: string;
			howToLoad: string;
			libraryType: string;
			remoteType: string;
			serverModules: Set<string>;
			shared: unknown;
		},
	) {}

	apply(compiler: webpack.Compiler) {
		const {
			clientModules,
			containerName,
			cwd,
			howToLoad,
			libraryType,
			remoteType,
			serverModules,
			shared,
		} = this.options;

		const allRemotes: Record<string, unknown> = {};
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const plugins: any[] = [];
		for (const plugin of compiler.options.plugins) {
			if (
				plugin &&
				(plugin.constructor.name === "ModuleFederationPlugin" ||
					plugin.constructor.name === "UniversalFederationPlugin")
			) {
				// @ts-expect-error
				Object.assign(allRemotes, plugin._options.remotes || {});
				plugins.push(plugin);
			}
		}

		const serverRSCContainer = new ModuleFederationPlugin({
			// isServer,
			name: containerName,
			exposes: Array.from(serverModules).reduce(
				(p, c) =>
					Object.assign(p, {
						[exposedNameFromResource(cwd, c)]: c,
					}),
				{},
			),
			remotes: Object.assign(allRemotes, {
				[containerName]: howToLoad,
			}),
			runtimePlugins: [
				require.resolve("framework/webpack.federation-runtime-plugin"),
			],
			shared,
			remoteType,
			library: libraryType
				? {
						name: ["var", "window"].includes(libraryType)
							? containerName
							: undefined,
						type: libraryType,
				  }
				: undefined,
		});
		serverRSCContainer.apply(compiler);

		plugins.push(serverRSCContainer);

		for (const plugin of plugins) {
			Object.assign(plugin._options.remotes, allRemotes);
		}

		const remotes = Object.assign(
			{},
			...plugins.map((p) => p._options.remotes),
		);

		new compiler.webpack.DefinePlugin({
			___REMOTES___: JSON.stringify(remotes),
		}).apply(compiler);

		rscServerPlugin
			.webpack({
				include: /\.[mc]?[tj]sx?$/,
				exclude: "this_should_never_match_anything",
				transformModuleId: (id, type) => {
					return `rsc/remote/${type.replace(
						/^use /,
						"",
					)}/${containerName}:${exposedNameFromResource(cwd, id)}`;
				},
				useClientRuntime: {
					function: "registerClientReference",
					module: "framework/runtime",
				},
				useServerRuntime: {
					function: "registerServerReference",
					module: "framework/runtime",
				},
				onModuleFound(id, type) {
					if (type === "use client") {
						clientModules.add(id);
					} else if (type === "use server") {
						serverModules.add(id);
					}
				},
			})
			.apply(compiler);

		class ContainerReferenceDependency extends compiler.webpack.dependencies
			.ModuleDependency {
			get type() {
				return "container-reference";
			}
		}

		const rsdResource = require.resolve("framework/framework");
		compiler.hooks.compilation.tap(
			"MyPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.hooks.optimizeModuleIds.tap("MyPlugin", (modules) => {
					for (const mod of modules as webpack.NormalModule[]) {
						if (mod.userRequest?.startsWith("webpack/container/")) {
							compilation.chunkGraph.setModuleId(mod, mod.userRequest);
						}
					}
				});
				compilation.hooks.optimizeChunks.tap("MyPlugin", (chunks) => {
					for (const chunk of chunks) {
						if (
							chunk.name &&
							compilation.chunkGraph
								.getChunkModules(chunk)
								.some((mod) => mod.type === "remote-module")
						) {
							chunk.id = chunk.name;
						}
					}
				});

				compilation.dependencyFactories.set(
					ContainerReferenceDependency,
					normalModuleFactory,
				);
				compilation.dependencyTemplates.set(
					ContainerReferenceDependency,
					new compiler.webpack.dependencies.NullDependency.Template(),
				);

				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const handler = (parser: any) => {
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					parser.hooks.program.tap("MyPlugin", (ast: any) => {
						const mod =
							/** @type {import("webpack").NormalModule} */ parser.state.module;

						if (mod.resource !== rsdResource) return;

						let attached = 0;
						for (const plugin of plugins) {
							if (plugin._options.remotes) {
								for (const key of Object.keys(plugin._options.remotes)) {
									attached++;
									const name = `rsc/remote/server/${key}`;
									const block = new compiler.webpack.AsyncDependenciesBlock(
										{
											name,
										},
										null,
										name,
									);
									block.addDependency(new ContainerReferenceDependency(key));

									mod.addBlock(block);
								}
							}
						}

						if (process.env.DEBUG === "1") {
							console.debug(
								`ℹ ${compiler.options.name} attached ${attached} remotes to react-server-dom-webpack\n`,
							);
						}
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("HarmonyModulesPlugin", handler);

				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("HarmonyModulesPlugin", handler);

				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("HarmonyModulesPlugin", handler);
			},
		);
	}
}

export class ClientRSCPlugin {
	constructor(
		private options: {
			clientModules: Set<string>;
			containerName: string;
			cwd: string;
			howToLoad: string;
			libraryType: string;
			remoteType: string;
			rsdResource: string;
			serverModules: Set<string>;
			shared: unknown;
		},
	) {}

	apply(compiler: webpack.Compiler) {
		const {
			clientModules,
			containerName,
			cwd,
			howToLoad,
			libraryType,
			remoteType,
			rsdResource,
			serverModules,
			shared,
		} = this.options;

		rscClientPlugin
			.webpack({
				include: /\.[mc]?[tj]sx?$/,
				exclude: "this_should_never_match_anything",
				transformModuleId: (id, type) => {
					return `rsc/remote/${type.replace(
						/^use /,
						"",
					)}/${containerName}:${exposedNameFromResource(cwd, id)}`;
				},
				useServerRuntime: {
					function: "registerServerReference",
					module: "framework/runtime",
				},
				onModuleFound(id, type) {
					if (type === "use server") {
						serverModules.add(id);
					}
				},
			})
			.apply(compiler);

		const allRemotes: Record<string, unknown> = {};
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const plugins: any[] = [];
		for (const plugin of compiler.options.plugins) {
			if (
				plugin &&
				(plugin.constructor.name === "ModuleFederationPlugin" ||
					plugin.constructor.name === "UniversalFederationPlugin")
			) {
				// @ts-expect-error
				Object.assign(allRemotes, plugin._options.remotes || {});
				plugins.push(plugin);
			}
		}

		const clientRSCContainer = new ModuleFederationPlugin({
			// isServer,
			name: containerName,
			exposes: Array.from(clientModules).reduce(
				(p, c) =>
					Object.assign(p, {
						[exposedNameFromResource(cwd, c)]: c,
					}),
				{},
			),
			remotes: Object.assign(allRemotes, {
				[containerName]: howToLoad,
			}),
			runtimePlugins: [
				require.resolve("framework/webpack.federation-runtime-plugin"),
			],
			shared,
			remoteType,
			library: libraryType
				? {
						name: ["var", "window"].includes(libraryType)
							? containerName
							: undefined,
						type: libraryType,
				  }
				: undefined,
		});
		clientRSCContainer.apply(compiler);
		plugins.push(clientRSCContainer);

		for (const plugin of plugins) {
			Object.assign(plugin._options.remotes, allRemotes);
		}

		const remotes = Object.assign(
			{},
			...plugins.map((p) => p._options.remotes),
		);

		new compiler.webpack.DefinePlugin({
			___REMOTES___: JSON.stringify(remotes),
		}).apply(compiler);

		// if (isServer) {
		//   new StreamingTargetPlugin({
		//     // name: this.containerName,
		//   }).apply(compiler);
		// }

		class ContainerReferenceDependency extends compiler.webpack.dependencies
			.ModuleDependency {
			get type() {
				return "container-reference";
			}
		}

		compiler.hooks.compilation.tap(
			"MyPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.hooks.optimizeModuleIds.tap("MyPlugin", (modules) => {
					for (const mod of modules as webpack.NormalModule[]) {
						if (mod.userRequest?.startsWith("webpack/container/")) {
							compilation.chunkGraph.setModuleId(mod, mod.userRequest);
						}
					}
				});
				compilation.hooks.optimizeChunks.tap("MyPlugin", (chunks) => {
					for (const chunk of chunks) {
						if (
							chunk.name &&
							compilation.chunkGraph
								.getChunkModules(chunk)
								.some((mod) => mod.type === "remote-module")
						) {
							chunk.id = chunk.name;
						}
					}
				});

				compilation.dependencyFactories.set(
					ContainerReferenceDependency,
					normalModuleFactory,
				);
				compilation.dependencyTemplates.set(
					ContainerReferenceDependency,
					new compiler.webpack.dependencies.NullDependency.Template(),
				);

				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const handler = (parser: any) => {
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					parser.hooks.program.tap("MyPlugin", (ast: any) => {
						const mod =
							/** @type {import("webpack").NormalModule} */ parser.state.module;

						if (mod.resource !== rsdResource) return;

						let attached = 0;
						for (const plugin of plugins) {
							if (plugin._options.remotes) {
								for (const key of Object.keys(plugin._options.remotes)) {
									attached++;
									const name = `rsc/remote/client/${key}`;
									const block = new compiler.webpack.AsyncDependenciesBlock(
										{
											name,
										},
										null,
										name,
									);
									block.addDependency(new ContainerReferenceDependency(key));

									mod.addBlock(block);
								}
							}
						}

						if (process.env.DEBUG === "1") {
							console.debug(
								`ℹ ${compiler.options.name} attached ${attached} remotes to react-server-dom-webpack\n`,
							);
						}
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("HarmonyModulesPlugin", handler);

				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("HarmonyModulesPlugin", handler);

				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("HarmonyModulesPlugin", handler);
			},
		);
	}
}

// Below is from ModuleFederation / universe or somewhere like that and should probably be imported from there instead

export class ExternalTemplateRemotesPlugin {
	static PLUGIN_NAME = "ExternalTemplateRemotesPlugin";
	apply(compiler: webpack.Compiler) {
		compiler.hooks.make.tap(
			ExternalTemplateRemotesPlugin.PLUGIN_NAME,
			(compilation) => {
				const scriptExternalModules: webpack.ExternalModule[] = [];

				compilation.hooks.buildModule.tap(
					ExternalTemplateRemotesPlugin.PLUGIN_NAME,
					(m) => {
						const mod = m as webpack.ExternalModule;
						if (
							mod.constructor.name === "ExternalModule" &&
							mod.externalType === "script"
						) {
							scriptExternalModules.push(mod);
						}
					},
				);
			},
		);
	}
}
