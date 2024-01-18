import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import fg from "fast-glob";
import webpack from "webpack";
import nodeExternals from "webpack-node-externals";
import VirtualModulesPlugin from "webpack-virtual-modules";
// @ts-expect-error
import VisualizerPlugin from "webpack-visualizer-plugin2";
import WebpackBar from "webpackbar";

import {
	ClientRSCPlugin,
	ExternalTemplateRemotesPlugin,
	ServerRSCPlugin,
} from "./webpack.plugins";

export interface ConfigDetails {
	build: "server" | "ssr" | "browser";
	webpack: typeof webpack;
}

export interface ConfigFunction {
	(
		config: webpack.Configuration,
		details: ConfigDetails,
	): Promise<webpack.Configuration> | webpack.Configuration;
}

type WebpackLoader = {
	/**
	 * Unique loader options identifier.
	 */
	ident?: string;
	/**
	 * Loader name.
	 */
	loader?: string;
	/**
	 * Loader options.
	 */
	options?: string | { [index: string]: unknown };
};

export async function getWebpackConfig(
	build: "server" | "server-actions" | "ssr" | "browser",
	{
		clientModules,
		cwd,
		mode,
		serverModules,
	}: {
		clientModules: Set<string>;
		cwd: string;
		mode: "development" | "production";
		serverModules: Set<string>;
	},
): Promise<
	webpack.Configuration & {
		name: "server" | "server-actions" | "ssr" | "browser";
	}
> {
	const devtool = false;
	// mode === "development" ? "eval-cheap-source-map" : "source-map";

	const extensions = [".ts", ".tsx", ".js", ".jsx"];

	const esbuildLoader = {
		loader: require.resolve("esbuild-loader"),
		options: {
			loader: "tsx",
			target: "es2020",
		},
	};

	const pkgJson = JSON.parse(
		await fsp.readFile(path.resolve(cwd, "package.json"), "utf8"),
	);
	const containerName = snakeCase(pkgJson.name);

	let config: webpack.Configuration & {
		name: "server" | "server-actions" | "ssr" | "browser";
	};
	switch (build) {
		case "server": {
			const routesDir = path.resolve(cwd, "app/routes");

			config = await baseServerConfig({
				clientModules,
				containerName,
				cwd,
				esbuildLoader,
				mode,
				devtool,
				extensions,
				routesDir,
				serverModules,
			});
			break;
		}
		case "server-actions": {
			const routesDir = path.resolve(cwd, "app/routes");

			config = await baseServerConfig({
				clientModules,
				containerName,
				cwd,
				esbuildLoader,
				mode,
				devtool,
				extensions,
				routesDir,
				serverModules,
			});
			config.entry = { empty: require.resolve("framework/entry/empty") };
			config.name = "server-actions";
			config.output = config.output || {};

			break;
		}
		case "ssr": {
			config = await baseSSRConfig({
				clientModules,
				containerName,
				cwd,
				esbuildLoader,
				mode,
				devtool,
				extensions,
				pkgJson,
				serverModules,
			});
			break;
		}
		case "browser": {
			config = await baseBrowserConfig({
				clientModules,
				containerName,
				cwd,
				esbuildLoader,
				mode,
				devtool,
				extensions,
				pkgJson,
				serverModules,
			});
			break;
		}
		default:
			throw new Error(`Invalid build type: ${build}`);
	}

	const webpackConfigPath = await findFileIfExists(cwd, [
		"webpack.config.mjs",
		"webpack.config.js",
		"webpack.config.cjs",
	]);

	if (webpackConfigPath) {
		const name = config.name;
		const webpackConfig = await import(pathToFileURL(webpackConfigPath).href);
		/** @type {import("framework/webpack").ConfigFunction | undefined} */
		const configFunc =
			typeof webpackConfig.default === "function"
				? webpackConfig.default
				: typeof webpackConfig === "function"
				  ? webpackConfig
				  : undefined;
		if (configFunc) {
			const newConfig =
				(await configFunc(config, {
					build: name,
					webpack,
				})) || config;
			config = Object.assign(newConfig, { name });
		}
	}

	return config;
}

async function baseServerConfig({
	clientModules,
	containerName,
	cwd,
	devtool,
	esbuildLoader,
	extensions,
	mode,
	routesDir,
	serverModules,
}: {
	clientModules: Set<string>;
	containerName: string;
	cwd: string;
	devtool: string | false;
	esbuildLoader: WebpackLoader;
	extensions: string[];
	mode: "development" | "production";
	routesDir: string;
	serverModules: Set<string>;
}): Promise<webpack.Configuration & { name: "server" }> {
	const bootstrapPath = path.resolve(cwd, "___bootstrap_server.js");
	const routesPath = path.resolve(cwd, "___routes_server.js");

	const serverEntryImport = "framework/entry/server";

	routesDir = path.resolve(cwd, routesDir || "app/routes");

	// TODO: Make this a virtual module, but for now this is nice for debugging the output still.
	const generated = await generateServerRoutes(routesPath, routesDir);

	return {
		name: "server",
		devtool,
		mode,
		entry: bootstrapPath,
		target: "node18",
		externals: [
			nodeExternals({
				allowlist: [
					"framework",
					"framework/server",
					"framework/client.internal",
					"framework/entry/server",
				],
			}),
		],
		resolve: {
			alias: { "#routes": routesPath },
			extensions,
			conditionNames: ["react-server", "webpack", "node", "require", "default"],
		},
		output: {
			library: {
				type: "commonjs-static",
			},
			path: path.resolve(cwd, "./dist/server"),
		},
		module: {
			rules: [
				{
					test: /\.[mc]?[tj]sx?$/,
					use: [esbuildLoader],
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				___CONTAINER_NAME___: JSON.stringify(containerName),
			}),
			new VirtualModulesPlugin({
				[bootstrapPath]: `export const handler = (...args) => import(${JSON.stringify(
					serverEntryImport,
				)}).then(m => m.handler(...args));`,
				[routesPath]: generated,
			}),
			new ServerRSCPlugin({
				clientModules,
				containerName,
				cwd,
				howToLoad: `commonjs ./${containerName}.js`,
				libraryType: "commonjs-static",
				remoteType: "commonjs",
				serverModules,
				shared: {
					react: {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react-dom": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react-dom/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					framework: { singleton: true, version: "1.0.0" },
					"framework/": { singleton: true, version: "1.0.0" },
					"react-server-dom-webpack/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
				},
			}),
			!!process.env.PROFILE &&
				new WebpackBar({
					name: "server",
					color: "#008080",
					fancy: false,
					profile: !!process.env.PROFILE,
				}),
		],
	};
}

async function baseSSRConfig({
	clientModules,
	containerName,
	cwd,
	devtool,
	esbuildLoader,
	extensions,
	mode,
	pkgJson,
	serverModules,
}: {
	clientModules: Set<string>;
	containerName: string;
	cwd: string;
	devtool: string | false;
	esbuildLoader: WebpackLoader;
	extensions: string[];
	mode: "development" | "production";
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	pkgJson: any;
	serverModules: Set<string>;
}): Promise<webpack.Configuration & { name: "ssr" }> {
	const bootstrapPath = path.resolve(cwd, "___bootstrap_ssr.js");

	const ssrEntryImport = "framework/entry/ssr";

	const rsdResource = require.resolve("react-server-dom-webpack/client.node");

	return {
		optimization: {
			minimize: false,
		},
		name: "ssr",
		devtool,
		mode,
		entry: bootstrapPath,
		target: "node18",
		externals: [
			nodeExternals({
				allowlist: ["framework", /^framework\//, /^react-server-dom-webpack/],
			}),
		],
		resolve: {
			conditionNames: ["webpack", "node", "require", "default"],
			extensions,
		},
		output: {
			library: {
				type: "commonjs-static",
			},
			path: path.resolve(cwd, "./dist/ssr"),
		},
		module: {
			rules: [
				{
					test: /\.[mc]?[tj]sx?$/,
					use: [esbuildLoader],
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				___CONTAINER_NAME___: JSON.stringify(containerName),
			}),
			new VirtualModulesPlugin({
				[bootstrapPath]: `export const handler = (...args) => import(${JSON.stringify(
					ssrEntryImport,
				)}).then(m => m.handler(...args));`,
			}),
			new ClientRSCPlugin({
				clientModules,
				cwd,
				rsdResource,
				libraryType: "commonjs-static",
				remoteType: "commonjs",
				containerName,
				howToLoad: `commonjs ./${containerName}.js`,
				serverModules,
				shared: {
					react: {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react-dom": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react-dom/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					framework: { singleton: true, version: "1.0.0" },
					"framework/": { singleton: true, version: "1.0.0" },
					"react-server-dom-webpack/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
				},
			}),
			!!process.env.PROFILE &&
				new WebpackBar({
					name: "ssr",
					color: "blue",
					fancy: false,
					profile: !!process.env.PROFILE,
				}),
			new VisualizerPlugin(),
		],
	};
}

async function baseBrowserConfig({
	clientModules,
	containerName,
	cwd,
	devtool,
	esbuildLoader,
	extensions,
	mode,
	pkgJson,
	serverModules,
}: {
	clientModules: Set<string>;
	containerName: string;
	cwd: string;
	devtool: string | false;
	esbuildLoader: WebpackLoader;
	extensions: string[];
	mode: "development" | "production";
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	pkgJson: any;
	serverModules: Set<string>;
}): Promise<webpack.Configuration & { name: "browser" }> {
	const bootstrapPath = path.resolve(cwd, "___bootstrap_browser.js");

	const browserEntryImport = "framework/entry/browser";

	const rsdResource = require.resolve(
		"react-server-dom-webpack/client.browser",
	);

	return {
		name: "browser",
		devtool,
		mode,
		entry: bootstrapPath,
		target: "browserslist:last 2 versions",
		resolve: {
			conditionNames: [
				"browser",
				"webpack",
				"module",
				"import",
				"require",
				"default",
			],
			extensions,
		},
		output: {
			path: path.resolve(cwd, "./dist/browser"),
		},
		module: {
			rules: [
				{
					test: /\.[mc]?[tj]sx?$/,
					use: [esbuildLoader],
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				___CONTAINER_NAME___: JSON.stringify(containerName),
			}),
			new ExternalTemplateRemotesPlugin(),
			new VirtualModulesPlugin({
				[bootstrapPath]: `import(${JSON.stringify(browserEntryImport)})`,
			}),
			new ClientRSCPlugin({
				clientModules,
				cwd,
				rsdResource,
				containerName,
				howToLoad: `${containerName}@[public_path]${containerName}.js`,
				libraryType: "window",
				remoteType: "script",
				serverModules,
				shared: {
					react: {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react-dom": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					"react-dom/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
					framework: { singleton: true, version: "1.0.0" },
					"framework/": { singleton: true, version: "1.0.0" },
					"react-server-dom-webpack/": {
						singleton: true,
						version: "0.0.0-experimental-1d5667a12-20240102",
					},
				},
			}),
			!!process.env.PROFILE &&
				new WebpackBar({
					name: "browser",
					color: "#000080",
					fancy: false,
					profile: !!process.env.PROFILE,
				}),
		],
	};
}

async function findFileIfExists(dir: string, names: string[]) {
	for (const name of names) {
		const file = path.resolve(dir, name);
		try {
			const stats = await fsp.stat(file);
			if (stats.isFile()) {
				return file;
			}
		} catch (err) {
			// @ts-expect-error
			if (err.code !== "ENOENT") {
				throw err;
			}
		}
	}
	return undefined;
}
type Lines = (string | Lines)[];
function indent(lines: Lines, indentLevel = 0): string {
	const indentation = "  ".repeat(indentLevel); // Using two spaces for indentation
	return lines
		.map((line) => {
			if (Array.isArray(line)) {
				// If the line is an array, recursively call indent with increased indentLevel
				return indent(line, indentLevel + 1);
			}
			// If the line is a string, just add the indentation
			return `${indentation}${line}`;
		})
		.join("\n");
}

async function generateServerRoutes(_outFile: string, routesDir: string) {
	const outFile = path.resolve(_outFile);
	const outDir = path.dirname(outFile);

	const routeFiles = await fg("*/*route.{ts,tsx,js,jsx}", {
		cwd: routesDir,
		onlyFiles: true,
	});

	const routeIds = [];
	type Route = {
		relative: string;
		id: string;
		path: string;
		index: boolean;
		children: Route[];
	};
	const routes: Record<string, Route> = {};
	let i = -1;
	for (const routeFile of routeFiles) {
		i++;
		const routeId = makeRouteIdFromRouteFile(routeFile);
		const pathname = makePathnameFromRouteId(routeId);
		const isIndexRoute = routeId === "_index" || routeId.endsWith("._index");

		let relative = path
			.relative(outDir, path.join(routesDir, routeFile))
			.replace(/\\/g, "/");
		relative = relative.startsWith(".") ? relative : `./${relative}`;

		routeIds.push(routeId);
		routes[routeId] = {
			relative,
			id: routeId,
			path: pathname,
			index: isIndexRoute,
			children: [],
		};
	}

	routeIds.sort();

	const rootRoutes = [];
	for (const routeId of routeIds) {
		const route = routes[routeId];
		const split = routeId.split(".");
		let found = false;
		for (let i = split.length - 1; i > 0; i--) {
			const parentId = split.slice(0, i).join(".");
			const parent = routes[parentId];
			if (parent) {
				parent.children.push(route);
				found = true;
				break;
			}
		}
		if (!found) {
			rootRoutes.push(route);
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const createRouteRecursive = (route: Route, inputParentPath = "/"): any[] => {
		const parentPath = inputParentPath.endsWith("/")
			? inputParentPath
			: `${inputParentPath}/`;
		const path = route.path.slice(parentPath.length);
		return [
			"{",
			[
				`id: ${JSON.stringify(route.id)},`,
				...(route.index ? ["index: true,"] : []),
				`path: ${JSON.stringify(path || null)},`,
				`lazy: () => import(${JSON.stringify(route.relative)}),`,
				...(!route.children.length
					? []
					: [
							"children: [",
							...route.children.map((child) =>
								createRouteRecursive(child, route.path),
							),
							"]",
					  ]),
			],
			"},",
		];
	};

	return indent([
		"\nexport const routes = [",
		...rootRoutes.map((route) => createRouteRecursive(route)),
		"];",
		"",
	]);
}

function makeRouteIdFromRouteFile(routeFile: string) {
	const ext = path.extname(routeFile);
	const base = routeFile.slice(0, -ext.length);
	return base.replace(/\\/g, "/").replace(/\/route$/, "");
}

function makePathnameFromRouteId(routeId: string) {
	const segments = `/${routeId}`
		.replace(/\/route$/, "")
		.replace(/\./g, "/")
		.replace(/\/_index$/, "")
		.replace(/^\//, "")
		.split("/");

	let pathname = "";
	for (let segment of segments) {
		if (segment.startsWith("_")) continue;
		if (segment.endsWith("_")) {
			segment = segment.slice(0, -1);
		}
		if (segment === "$") {
			segment = "*";
		}

		const optional = segment.startsWith("(") && segment.endsWith(")");
		if (optional) {
			segment = segment.slice(1, -1);
		}

		if (segment.startsWith("$")) {
			segment = `:${segment.slice(1)}`;
		}

		if (!segment) continue;

		if (optional) {
			segment += "?";
		}

		pathname += `/${segment}`;
	}
	return pathname || "/";
}

function snakeCase(str: string) {
	return str
		.replace(/\W+/g, " ")
		.split(/ |\B(?=[A-Z])/)
		.map((word) => word.toLowerCase())
		.join("_");
}
