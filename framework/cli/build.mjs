import * as path from "node:path";

import webpack from "webpack";

import { getWebpackConfig } from "framework/webpack";

export async function build() {
  const cwd = process.cwd();
  const mode =
    process.env.NODE_ENV === "development" ? "development" : "production";

  const clientModules = new Set();
  console.log("Building server bundle...");
  console.time("server");
  await runWebpack(
    await getWebpackConfig("server", {
      clientModules,
      cwd,
      mode,
    })
  );
  console.timeEnd("server");

  console.log("\nBuilding ssr and browser bundles...");
  console.time("ssr");
  console.time("browser");
  await Promise.all([
    runWebpack(
      await getWebpackConfig("ssr", {
        clientModules,
        cwd,
        mode,
      })
    ).then(() => console.timeEnd("ssr")),

    runWebpack(
      await getWebpackConfig("browser", {
        clientModules,
        cwd,
        mode,
      })
    ).then(() => console.timeEnd("browser")),
  ]);
}

/**
 * @param {webpack.Configuration & { name: "server" | "ssr" | "browser" }} config
 * @returns
 */
function runWebpack(config) {
  return new Promise(async (resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        return reject(err);
      }
      if (!stats) {
        return reject(new Error("No stats returned from webpack"));
      }
      if (stats.hasErrors()) {
        return reject(new Error(stats.toString()));
      }
      resolve(stats);
    });
  });
}
