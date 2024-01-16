const { ModuleFederationPlugin } = require("@module-federation/enhanced");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const pkgJson = require("./package.json");
const { REMOTES } = require("./remotes.cjs");

/** @type {import("framework/webpack").ConfigFunction} */
module.exports = (config, { build, webpack }) => {
	config.plugins = config.plugins || [];
	config.resolve = config.resolve || {};
	config.resolve.plugins = config.resolve.plugins || [];
	config.resolve.plugins.push(new TsconfigPathsPlugin());

	switch (build) {
		case "server":
			config.module = config.module || {};
			config.module.rules = config.module.rules || [];
			config.module.rules.push({
				test: /\.css$/,
				exclude: /node_modules/,
				type: "asset/resource",
				use: [require.resolve("postcss-loader")],
			});

			config.plugins.push(
				new webpack.DefinePlugin({
					__REMOTES__: JSON.stringify(
						Object.entries(REMOTES).reduce(
							(acc, [name, remote]) => {
								acc[name] = remote.rsc;
								return acc;
							},
							/** @type {Record<string, string>} */ ({}),
						),
					),
				}),
			);
			break;
		case "browser":
			config.plugins.push(
				new ModuleFederationPlugin({
					remoteType: "script",
					remotes: Object.entries(REMOTES).reduce(
						(acc, [name, remote]) => {
							acc[name] = `${name}@${remote.url}`;
							return acc;
						},
						/** @type {Record<string, string>} */ ({}),
					),
					shared: {
						"react/": { version: pkgJson.dependencies.react, singleton: true },
						"react-dom/": {
							version: pkgJson.dependencies["react-dom"],
							singleton: true,
						},
						"framework/": { singleton: true },
						"react-server-dom-webpack/client": { singleton: true },
					},
				}),
			);
			break;
		case "ssr":
			config.plugins.push(
				new ModuleFederationPlugin({
					remoteType: "commonjs",
					remotes: Object.entries(REMOTES).reduce(
						(acc, [name, remote]) => {
							acc[name] = `commonjs ${remote.require}`;
							return acc;
						},
						/** @type {Record<string, string>} */ ({}),
					),
					shared: {
						"react/": { version: pkgJson.dependencies.react, singleton: true },
						"react-dom/": {
							version: pkgJson.dependencies["react-dom"],
							singleton: true,
						},
						"framework/": { singleton: true },
						"react-server-dom-webpack/client": { singleton: true },
					},
				}),
			);
			break;
	}

	return config;
};
