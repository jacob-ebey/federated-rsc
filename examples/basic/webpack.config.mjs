//@ts-nocheck

// import universe from "@module-federation/node";
// const { UniversalFederationPlugin } = universe;
//@ts-nocheck
export default (config, { build, webpack }) => {
  if (!config.plugins) {
    config.plugins = [];
  }
  config.optimization = {
    ...config.optimization,
    minimize: false,
  };
  return config;
};
