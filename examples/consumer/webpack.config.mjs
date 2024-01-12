// import universe from "@module-federation/node";
// const { UniversalFederationPlugin } = universe;
//@ts-ignore
import * as mfp  from "@module-federation/enhanced";
//@ts-ignore
const {ModuleFederationPlugin} = mfp.default
/** @type {import("framework/webpack").ConfigFunction} */
export default (config, { build, webpack }) => {
  if (!config.plugins) {
    config.plugins = [];
  }

  switch (build) {
    case "browser":
      config.plugins.push(
        new ModuleFederationPlugin({
          remotes: {
            _example_basic:
              "_example_basic@http://localhost:3001/dist/browser/_example_basic.js",
          },
        })
      );
      break;
    case "ssr":
      config.plugins.push(
        new ModuleFederationPlugin({
          remotes: {
            _example_basic:
              "commonjs ../../../basic/dist/ssr/_example_basic.js",
          },
        })
      );
      break;
  }

  return config;
};
