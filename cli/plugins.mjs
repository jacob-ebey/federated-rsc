import * as path from "node:path";

export class ServerRSCPlugin {
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
        const handler = (parser) => {
          parser.hooks.program.tap("MyPlugin", (ast) => {
            const mod = parser.state.module;

            for (const node of ast.body) {
              if (node.type !== "ExpressionStatement") break;

              if (node.directive === "use client") {
                clientModules.add(mod.resource);
              }
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
      }
    );
  }
}

export class ClientRSCPlugin {
  constructor({
    clientModules,
    cwd,
    rsdResource,
    containerName,
    howToLoad,
    shared,
  }) {
    this.clientModules = clientModules;
    this.cwd = cwd;
    this.rsdResource = rsdResource;
    this.containerName = containerName;
    this.howToLoad = howToLoad;
    this.shared = shared;
  }

  /**
   * @param {import("webpack").Compiler} compiler
   */
  apply(compiler) {
    const browserRSCContainer =
      new compiler.webpack.container.ModuleFederationPlugin({
        name: this.containerName,
        exposes: Array.from(this.clientModules).reduce(
          (p, c) =>
            Object.assign(p, {
              [exposedNameFromResource(this.cwd, c)]: c,
            }),
          {}
        ),
        remotes: {
          [this.containerName]:
            "client_modules@/dist/browser/client_modules.js",
        },
        shared: this.shared,
      });
    browserRSCContainer.apply(compiler);

    class ContainerReferenceDependency extends compiler.webpack.dependencies
      .ModuleDependency {
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
        const runtimeTemplate = this.compilation.runtimeTemplate;
        // TODO: instead of adding a new "rsc" key to ensureChunkHandlers, override ensureChunk
        // and intercept prefixed "rsc/remote/client/" chunk identifiers.
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
                "var exposed = chunkId.slice(splitIndex + 1);",
                "console.log({chunkId, remote, exposed, remoteModuleId});",

                "var promises = [];",
                `${
                  RuntimeGlobals.ensureChunkHandlers
                }.remotes(remote, promises);
                return Promise.all(promises).then(${runtimeTemplate.basicFunction(
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
                    "console.log(mod);",
                    // TODO: if HMR is an issue, make this a Proxy to the underlying module
                    `${RuntimeGlobals.moduleCache}[chunkId] = {
                      id: chunkId,
                      loaded: true,
                      exports: mod,
                    };`,
                  ]
                )});`,
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
        compilation.hooks.beforeModuleIds.tap("MyPlugin", (modules) => {
          for (const mod of modules) {
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

        const handler = (parser) => {
          parser.hooks.program.tap("MyPlugin", (ast) => {
            const mod = /** @type {import("webpack").Module} */ (
              parser.state.module
            );

            if (mod.resource !== this.rsdResource) return;

            console.log("Attaching RSC remotes to build");
            if (browserRSCContainer._options.remotes) {
              for (const key of Object.keys(
                browserRSCContainer._options.remotes
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

        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.loadScript)
          .tap("MyPlugin", (chunk, set) => {
            set.add(RuntimeGlobals.moduleFactoriesAddOnly);
            set.add(RuntimeGlobals.hasOwnProperty);
            compilation.addRuntimeModule(
              chunk,
              new ContainerReferenceRuntimeModule()
            );
          });
      }
    );
  }
}

function exposedNameFromResource(cwd, resource) {
  const relative = path.relative(cwd, resource).replace(/\\/g, "/");
  return "./" + relative.replace(/\.\.\//g, "__/");
}
