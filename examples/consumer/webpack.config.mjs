import universe from "@module-federation/node";
const { UniversalFederationPlugin } = universe;

/** @type {import("framework/webpack").ConfigFunction} */
export default (config, { build, webpack }) => {
  if (!config.plugins) {
    config.plugins = [];
  }

  switch (build) {
    case "browser":
      config.plugins.push(
        new UniversalFederationPlugin(
          {
            isServer: false,
            remotes: {
              _example_basic:
                "_example_basic@http://localhost:3001/dist/browser/_example_basic.js",
            },
          },
          { ModuleFederationPlugin: webpack.container.ModuleFederationPlugin }
        )
      );
      break;
    case "ssr":
      config.plugins.push(
        new UniversalFederationPlugin(
          {
            isServer: true,
            remotes: {
              _example_basic:
                "_example_basic@http://localhost:3001/dist/ssr/_example_basic.js",
            },
          },
          { ModuleFederationPlugin: webpack.container.ModuleFederationPlugin }
        )
      );
      break;
  }

  return config;
};
