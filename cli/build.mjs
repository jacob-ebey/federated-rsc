import { createRequire } from "node:module";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import webpack from "webpack";
import nodeExternals from "webpack-node-externals";
import VirtualModulesPlugin from "webpack-virtual-modules";

import { generate } from "./generate.mjs";
import { ClientRSCPlugin, ServerRSCPlugin } from "./plugins.mjs";

await build();

async function build() {
  const cwd = process.cwd();
  const routesDir = path.resolve(cwd, "app/routes");
  const devtool = false;
  const mode = "production";
  const browserEntry = undefined;
  const generatedRoutes = undefined;
  const containerName = "client_modules";

  const pkgJson = JSON.parse(
    await fsp.readFile(path.resolve(cwd, "package.json"), "utf8")
  );

  const rsdBrowserResource = import.meta.resolve
    ? fileURLToPath(
        import.meta.resolve("react-server-dom-webpack/client.browser")
      )
    : createRequire(fileURLToPath(import.meta.url)).resolve(
        "react-server-dom-webpack/client.browser"
      );
  const rsdSsrResource = import.meta.resolve
    ? fileURLToPath(import.meta.resolve("react-server-dom-webpack/client.node"))
    : createRequire(fileURLToPath(import.meta.url)).resolve(
        "react-server-dom-webpack/client.node"
      );

  const alias = {
    // TODO: resolve these relative to import.meta.url
    "#framework/browser": path.resolve("./lib/framework.browser.tsx"),
    "#framework/ssr": path.resolve("./lib/framework.ssr.tsx"),
    "#framework": path.resolve("./lib/framework.server.tsx"),
  };

  const extensions = [".ts", ".tsx", ".js", ".jsx"];

  const esbuildLoader = {
    loader: "esbuild-loader",
    options: {
      loader: "tsx",
      target: "es2020",
    },
  };

  const bootstrapBrowserPath = path.resolve(cwd, "___bootstrap_browser.js");
  const bootstrapSsrPath = path.resolve(cwd, "___bootstrap_ssr.js");

  const routesPath = path.resolve(cwd, generatedRoutes || "./routes.ts");
  let serverEntry = path.relative(cwd, path.resolve(cwd, routesPath));
  if (!serverEntry.startsWith(".")) {
    serverEntry = "./" + serverEntry;
  }

  const generated = await generate(routesPath, routesDir);

  await fsp.mkdir(path.dirname(path.resolve(routesPath)), { recursive: true });
  await fsp.writeFile(routesPath, generated, "utf8");

  const clientModules = new Set();
  const serverStats = await runWebpack({
    devtool,
    mode,
    entry: serverEntry,
    target: "node18",
    externals: [
      nodeExternals({
        allowlist: ["#generated"],
      }),
    ],
    resolve: { alias: { ...alias, "#routes": routesPath }, extensions },
    output: {
      library: {
        type: "commonjs-static",
      },
      path: path.resolve("./dist/server"),
    },
    module: {
      rules: [
        {
          test: /\.m?[tj]sx?$/,
          use: [
            {
              loader: path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                "server-loader.mjs"
              ),
              options: {
                containerName,
                cwd,
              },
            },
            esbuildLoader,
          ],
        },
      ],
    },
    plugins: [new ServerRSCPlugin(clientModules)],
  });

  const resolvedSsrEntry = path.resolve(cwd, browserEntry || "./entry/ssr.tsx");
  let ssrEntryImport = path.relative(cwd, resolvedSsrEntry);
  if (!ssrEntryImport.startsWith(".")) {
    ssrEntryImport = "./" + ssrEntryImport;
  }
  const ssrStats = await runWebpack({
    devtool,
    mode,
    entry: bootstrapSsrPath,
    target: "node18",
    externals: [
      nodeExternals({
        allowlist: ["#generated", "react-server-dom-webpack/client.node"],
      }),
    ],
    resolve: { alias, extensions },
    output: {
      library: {
        type: "commonjs-static",
      },
      path: path.resolve("./dist/ssr"),
    },
    module: {
      rules: [
        {
          test: /\.m?[tj]sx?$/,
          use: [esbuildLoader],
        },
      ],
    },
    plugins: [
      new VirtualModulesPlugin({
        [bootstrapSsrPath]: `export const handler = import(${JSON.stringify(
          ssrEntryImport
        )}).then(m => m.handler)`,
      }),
      new ClientRSCPlugin({
        clientModules,
        cwd,
        rsdResource: rsdSsrResource,
        libraryType: "commonjs-static",
        containerName,
        howToLoad: "commonjs ./client_modules.js",
        shared: {
          react: pkgJson.dependencies.react,
          "react-dom": pkgJson.dependencies["react-dom"],
        },
      }),
    ],
  });

  const resolvedBrowserEntry = path.resolve(
    cwd,
    browserEntry || "./entry/browser.tsx"
  );
  let browserEntryImport = path.relative(cwd, resolvedBrowserEntry);
  if (!browserEntryImport.startsWith(".")) {
    browserEntryImport = "./" + browserEntryImport;
  }
  const browserStats = await runWebpack({
    devtool,
    mode,
    entry: bootstrapBrowserPath,
    target: "browserslist:last 2 versions",
    resolve: { alias, extensions },
    output: {
      path: path.resolve("./dist/browser"),
    },
    module: {
      rules: [
        {
          test: /\.m?[tj]sx?$/,
          use: [esbuildLoader],
        },
      ],
    },
    plugins: [
      new VirtualModulesPlugin({
        [bootstrapBrowserPath]: `import(${JSON.stringify(browserEntryImport)})`,
      }),
      new ClientRSCPlugin({
        clientModules,
        cwd,
        rsdResource: rsdBrowserResource,
        containerName,
        howToLoad:
          "script client_modules@http://localhost:3001/dist/browser/client_modules.js",
        libraryType: "var",
        shared: {
          react: pkgJson.dependencies.react,
          "react-dom": pkgJson.dependencies["react-dom"],
        },
      }),
    ],
  });
}

/**
 *
 * @param {webpack.Configuration} config
 * @returns
 */
function runWebpack(config) {
  return new Promise((resolve, reject) => {
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

function exposedNameFromResource(cwd, resource) {
  const relative = path.relative(cwd, resource).replace(/\\/g, "/");
  return "./" + relative.replace(/\.\.\//g, "__/");
}
