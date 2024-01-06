import * as path from "node:path";

import universe from "@module-federation/node";
const { StreamingTargetPlugin, UniversalFederationPlugin } = universe;

export class ServerRSCPlugin {
  /**
   * @param {Set<string>} clientModules
   */
  constructor(clientModules) {
    this.clientModules = clientModules;
  }

  /**
   * @param {import("webpack").Compiler} compiler
   */
  apply(compiler) {
    const clientModules = this.clientModules;
    compiler.hooks.thisCompilation.tap(
      "MyPlugin",
      (compilation, { normalModuleFactory }) => {
        /**
         *
         * @param {any} parser
         */
        const handler = (parser) => {
          parser.hooks.program.tap(
            "MyPlugin",
            /**
             * @param {any} ast
             */
            (ast) => {
              const mod = parser.state.module;

              for (const node of ast.body) {
                if (node.type !== "ExpressionStatement") break;

                if (node.directive === "use client") {
                  clientModules.add(mod.resource);
                }
              }
            }
          );
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
      }
    );
  }
}

export class ClientRSCPlugin {
  /**
   *
   * @param {{
   *   clientModules: Set<string>;
   *   cwd: string;
   *   rsdResource: string;
   *   libraryType: string;
   *   containerName: string;
   *   howToLoad: string;
   *   shared: any;
   * }} args
   */
  constructor({
    clientModules,
    cwd,
    rsdResource,
    libraryType,
    containerName,
    howToLoad,
    shared,
  }) {
    this.clientModules = clientModules;
    this.cwd = cwd;
    this.rsdResource = rsdResource;
    this.libraryType = libraryType;
    this.containerName = containerName;
    this.howToLoad = howToLoad;
    this.shared = shared;
  }

  /**
   * @param {import("webpack").Compiler} compiler
   */
  apply(compiler) {
    const isServer = this.libraryType !== "var";
    const clientRSCContainer = new UniversalFederationPlugin(
      {
        isServer,
        name: this.containerName,
        exposes: Array.from(this.clientModules).reduce(
          (p, c) =>
            Object.assign(p, {
              [exposedNameFromResource(this.cwd, c)]: c,
            }),
          {}
        ),
        remotes: {
          [this.containerName]: this.howToLoad,
        },
        shared: this.shared,
        library: this.libraryType
          ? {
              name: this.libraryType === "var" ? this.containerName : undefined,
              type: this.libraryType,
            }
          : undefined,
      },
      {
        ModuleFederationPlugin:
          compiler.webpack.container.ModuleFederationPlugin,
      }
    );
    clientRSCContainer.apply(compiler);

    if (isServer) {
      new StreamingTargetPlugin({
        // name: this.containerName,
      }).apply(compiler);
    }

    class ContainerReferenceDependency extends compiler.webpack.dependencies
      .ModuleDependency {
      /**
       *
       * @param {string} request
       */
      constructor(request) {
        super(request);
      }

      get type() {
        return "container-reference";
      }
    }

    const RuntimeGlobals = compiler.webpack.RuntimeGlobals;
    const Template = compiler.webpack.Template;

    class ContainerReferenceRuntimeModule extends compiler.webpack
      .RuntimeModule {
      constructor() {
        super("ensure chunk rsc container reference runtime");
      }
      generate() {
        if (!this.compilation) throw new Error("No compilation");
        const runtimeTemplate = this.compilation.runtimeTemplate;
        return Template.asString([
          `var ogEnsureChunk = ${RuntimeGlobals.ensureChunk};`,
          "// this function allows you to load federated modules through react server component decoding",
          `${RuntimeGlobals.ensureChunk} = ${runtimeTemplate.basicFunction(
            ["chunkId"],
            [
              "if (typeof chunkId === 'string' && chunkId.startsWith('rsc/remote/client/')) {",
              Template.indent([
                "var splitIndex = chunkId.indexOf(':', 18);",
                "var remote = chunkId.slice(0, splitIndex);",
                "var remoteModuleId = remote.slice(18);",
                "var [exposed] = chunkId.slice(splitIndex + 1).split('#');",
                "var promises = [];",
                `${RuntimeGlobals.ensureChunkHandlers}.remotes(chunkId, promises);`,
                `return Promise.all(promises).then(${runtimeTemplate.basicFunction(
                  ["r"],
                  [
                    `return ${RuntimeGlobals.require}("webpack/container/reference/" + remoteModuleId);`,
                  ]
                )}).then(${runtimeTemplate.basicFunction(
                  ["container"],
                  ["return container.get(exposed);"]
                )}).then(${runtimeTemplate.basicFunction(
                  ["factory"],
                  [
                    "var mod = factory();",
                    // TODO: if HMR is an issue, make this a Proxy to the underlying module
                    `${RuntimeGlobals.moduleCache}[chunkId] = {
                      id: chunkId,
                      loaded: true,
                      exports: mod,
                    };`,
                  ]
                )})`,
              ]),
              "}",
              "return ogEnsureChunk(chunkId);",
            ]
          )};`,
        ]);
      }
    }

    compiler.hooks.compilation.tap(
      "MyPlugin",
      (compilation, { normalModuleFactory }) => {
        compilation.hooks.optimizeModuleIds.tap("MyPlugin", (modules) => {
          for (const mod of /** @type {import("webpack").NormalModule[]} */ (
            modules
          )) {
            if (
              mod.userRequest &&
              mod.userRequest.startsWith("webpack/container/reference/")
            ) {
              compilation.chunkGraph.setModuleId(mod, mod.userRequest);
            }
          }
        });

        compilation.dependencyFactories.set(
          ContainerReferenceDependency,
          normalModuleFactory
        );
        compilation.dependencyTemplates.set(
          ContainerReferenceDependency,
          new compiler.webpack.dependencies.NullDependency.Template()
        );

        /**
         *
         * @param {any} parser
         */
        const handler = (parser) => {
          parser.hooks.program.tap(
            "MyPlugin",
            /**
             *
             * @param {any} ast
             */
            (ast) => {
              const mod = /** @type {import("webpack").NormalModule} */ (
                parser.state.module
              );

              if (mod.resource !== this.rsdResource) return;

              console.log("Attaching RSC remotes to build");

              if (clientRSCContainer._options.remotes) {
                for (const key of Object.keys(
                  clientRSCContainer._options.remotes
                )) {
                  const name = `rsc/remote/client/${key}`;
                  const block = new compiler.webpack.AsyncDependenciesBlock(
                    {
                      name,
                    },
                    null,
                    name
                  );
                  block.addDependency(new ContainerReferenceDependency(key));

                  mod.addBlock(block);
                }
              }
            }
          );
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

        /**
         *
         * @param {import("webpack").Chunk} chunk
         * @param {Set<string>} set
         */
        const requirementsHandler = (chunk, set) => {
          set.add(RuntimeGlobals.moduleFactoriesAddOnly);
          set.add(RuntimeGlobals.hasOwnProperty);
          compilation.addRuntimeModule(
            chunk,
            new ContainerReferenceRuntimeModule()
          );
        };
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.ensureChunk)
          .tap("MyPlugin", requirementsHandler);
      }
    );
  }
}

/**
 * @param {string} cwd
 * @param {string} resource
 */
function exposedNameFromResource(cwd, resource) {
  const relative = path.relative(cwd, resource).replace(/\\/g, "/");
  return "./" + relative.replace(/\.\.\//g, "__/");
}
