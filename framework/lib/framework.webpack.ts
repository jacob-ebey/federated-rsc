import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import fg from "fast-glob";
import webpack from "webpack";
import WebpackBar from "webpackbar";
import nodeExternals from "webpack-node-externals";
import VirtualModulesPlugin from "webpack-virtual-modules";
import VisualizerPlugin from "webpack-visualizer-plugin2";

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
  (config: webpack.Configuration, details: ConfigDetails):
    | Promise<webpack.Configuration>
    | webpack.Configuration;
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
  options?: string | { [index: string]: any };
};

export async function getWebpackConfig(
  build: "server" | "ssr" | "browser",
  {
    clientModules,
    cwd,
    mode,
  }: {
    clientModules: Set<string>;
    cwd: string;
    mode: "development" | "production";
  }
): Promise<webpack.Configuration & { name: "server" | "ssr" | "browser" }> {
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
    await fsp.readFile(path.resolve(cwd, "package.json"), "utf8")
  );
  const containerName = snakeCase(pkgJson.name);

  let config: webpack.Configuration & { name: "server" | "ssr" | "browser" };

  switch (build) {
    case "server":
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
      });
      break;
    case "ssr":
      config = await baseSSRConfig({
        clientModules,
        containerName,
        cwd,
        esbuildLoader,
        mode,
        devtool,
        extensions,
        pkgJson,
      });
      break;
    case "browser":
      config = await baseBrowserConfig({
        clientModules,
        containerName,
        cwd,
        esbuildLoader,
        mode,
        devtool,
        extensions,
        pkgJson,
      });
      break;
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
      let newConfig =
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
}: {
  clientModules: Set<string>;
  containerName: string;
  cwd: string;
  devtool: string | false;
  esbuildLoader: WebpackLoader;
  extensions: string[];
  mode: "development" | "production";
  routesDir: string;
}): Promise<webpack.Configuration & { name: "server" }> {
  const bootstrapPath = path.resolve(cwd, "___bootstrap_serverr.js");
  const routesPath = path.resolve(cwd, "___routes_server.js");

  let serverEntryImport = "framework/entry/server";

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
          "framework/server.shared",
          "framework/client",
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
          use: [
            {
              loader: require.resolve("framework/webpack/server-loader"),
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
    plugins: [
      new webpack.DefinePlugin({
        ___CONTAINER_NAME___: JSON.stringify(containerName),
      }),
      new VirtualModulesPlugin({
        [bootstrapPath]: `export const handler = (...args) => import(${JSON.stringify(
          serverEntryImport
        )}).then(m => m.handler(...args));`,
        [routesPath]: generated,
      }),
      new ServerRSCPlugin(clientModules),
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
}: {
  clientModules: Set<string>;
  containerName: string;
  cwd: string;
  devtool: string | false;
  esbuildLoader: WebpackLoader;
  extensions: string[];
  mode: "development" | "production";
  pkgJson: any;
}): Promise<webpack.Configuration & { name: "ssr" }> {
  const bootstrapPath = path.resolve(cwd, "___bootstrap_ssr.js");

  let ssrEntryImport = "framework/entry/ssr";

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
        allowlist: [
          "framework/client",
          "framework/react.client",
          "framework/entry/ssr",
          "react-server-dom-webpack/client",
        ],
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
          ssrEntryImport
        )}).then(m => m.handler(...args));`,
      }),
      new ClientRSCPlugin({
        clientModules,
        cwd,
        rsdResource,
        libraryType: "commonjs-static",
        containerName,
        howToLoad: `commonjs ./${containerName}.js`,
        shared: {
          react: pkgJson.dependencies.react,
          "react/jsx-runtime": pkgJson.dependencies.react,
          "react-dom": pkgJson.dependencies["react-dom"],
          framework: { singleton: true },
          "framework/client": { singleton: true },
          "framework/react.client": { singleton: true },
          "react-server-dom-webpack/client": { singleton: true },
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
}: {
  clientModules: Set<string>;
  containerName: string;
  cwd: string;
  devtool: string | false;
  esbuildLoader: WebpackLoader;
  extensions: string[];
  mode: "development" | "production";
  pkgJson: any;
}): Promise<webpack.Configuration & { name: "browser" }> {
  const bootstrapPath = path.resolve(cwd, "___bootstrap_browser.js");

  const browserEntryImport = "framework/entry/browser";

  const rsdResource = require.resolve(
    "react-server-dom-webpack/client.browser"
  );

  //FIXME: just hardcode for test
  let publicPath = containerName.includes('consumer') ? 'http://localhost:4001/' : 'http://localhost:3001/'

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
        libraryType: "var",
        shared: {
          react: pkgJson.dependencies.react,
          "react/jsx-runtime": pkgJson.dependencies.react,
          "react-dom": pkgJson.dependencies["react-dom"],
          framework: { singleton: true },
          "framework/client": { singleton: true },
          "framework/react.client": { singleton: true },
          "react-server-dom-webpack/client": { singleton: true },
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
      // @ts-ignore
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
      } else {
        // If the line is a string, just add the indentation
        return `${indentation}${line}`;
      }
    })
    .join("\n");
}

async function generateServerRoutes(outFile: string, routesDir: string) {
  outFile = path.resolve(outFile);
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
    relative = relative.startsWith(".") ? relative : "./" + relative;

    //@ts-ignore
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
    //@ts-ignore
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
      //@ts-ignore
      rootRoutes.push(route);
    }
  }

  const createRouteRecursive = (route: Route, parentPath = "/"): any[] => {
    parentPath = parentPath.endsWith("/") ? parentPath : parentPath + "/";
    const path = route.path.slice(parentPath.length);
    return [
      "{",
      [
        "id: " + JSON.stringify(route.id) + ",",
        ...(route.index ? ["index: true,"] : []),
        ...(path ? ["path: " + JSON.stringify(path) + ","] : []),
        "lazy: () => import(" + JSON.stringify(route.relative) + "),",
        ...(!route.children.length
          ? []
          : [
              "children: [",
              ...route.children.map((child) =>
                createRouteRecursive(child, route.path)
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
  const segments = ("/" + routeId)
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

    let optional = segment.startsWith("(") && segment.endsWith(")");
    if (optional) {
      segment = segment.slice(1, -1);
    }

    if (segment.startsWith("$")) {
      segment = ":" + segment.slice(1);
    }

    if (!segment) continue;

    if (optional) {
      segment += "?";
    }

    pathname += "/" + segment;
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
