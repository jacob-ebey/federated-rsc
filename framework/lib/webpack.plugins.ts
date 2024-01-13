import { ModuleFederationPlugin } from "@module-federation/enhanced";
import { rscClientPlugin, rscServerPlugin } from "unplugin-rsc";
import type * as webpack from "webpack";

import { exposedNameFromResource } from "./utils";

export class ServerRSCPlugin {
  constructor(
    private options: {
      clientModules: Set<string>;
      containerName: string;
      cwd: string;
      serverModules: Set<string>;
    }
  ) {}

  apply(compiler: webpack.Compiler) {
    const { clientModules, containerName, cwd, serverModules } = this.options;

    rscServerPlugin
      .webpack({
        include: /\.[mc]?[tj]sx?$/,
        exclude: "this_should_never_match_anything",
        transformModuleId: (id, type) => {
          return (
            `rsc/remote/${type.replace(/^use /, "")}/${containerName}:` +
            exposedNameFromResource(cwd, id)
          );
        },
        useClientRuntime: {
          function: "registerClientReference",
          module: "framework/runtime",
        },
        useServerRuntime: {
          function: "registerServerReference",
          module: "framework/runtime",
        },
        onModuleFound(id, type) {
          if (type === "use client") {
            clientModules.add(id);
          } else if (type === "use server") {
            serverModules.add(id);
          }
        },
      })
      .apply(compiler);
  }
}

export class ClientRSCPlugin {
  constructor(
    private options: {
      clientModules: Set<string>;
      containerName: string;
      cwd: string;
      howToLoad: string;
      libraryType: string;
      remoteType: string;
      rsdResource: string;
      serverModules: Set<string>;
      shared: any;
    }
  ) {}

  apply(compiler: webpack.Compiler) {
    const {
      clientModules,
      containerName,
      cwd,
      howToLoad,
      libraryType,
      remoteType,
      rsdResource,
      serverModules,
      shared,
    } = this.options;

    rscClientPlugin.webpack({
      include: /\.[mc]?[tj]sx?$/,
      exclude: "this_should_never_match_anything",
      transformModuleId: (id, type) => {
        return (
          `rsc/remote/${type.replace(/^use /, "")}/${containerName}` +
          exposedNameFromResource(cwd, id)
        );
      },
      useServerRuntime: {
        function: "registerServerReference",
        module: "framework/runtime",
      },
      onModuleFound(id, type) {
        if (type === "use server") {
          serverModules.add(id);
        }
      },
    });

    const federationPlugins: any[] = [];
    for (const plugin of compiler.options.plugins) {
      if (plugin && plugin.constructor.name === "ModuleFederationPlugin") {
        //// @ts-expect-error
        federationPlugins.push(plugin);
      }
    }

    const clientRSCContainer = new ModuleFederationPlugin({
      // isServer,
      name: containerName,
      exposes: Array.from(clientModules).reduce(
        (p, c) =>
          Object.assign(p, {
            [exposedNameFromResource(cwd, c)]: c,
          }),
        {}
      ),
      remotes: {
        ...federationPlugins.reduce(
          (r, p) => ({
            ...r,
            ...p._options.remotes,
          }),
          {}
        ),
        [containerName]: howToLoad,
      },
      runtimePlugins: [
        require.resolve("framework/webpack.federation-runtime-plugin"),
      ],
      shared: shared,
      remoteType,
      library: libraryType
        ? {
            name: ["var", "window"].includes(libraryType)
              ? containerName
              : undefined,
            type: libraryType,
          }
        : undefined,
    });
    clientRSCContainer.apply(compiler);
    // plugins.push(clientRSCContainer);

    // if (isServer) {
    //   new StreamingTargetPlugin({
    //     // name: this.containerName,
    //   }).apply(compiler);
    // }

    // class ContainerReferenceDependency extends compiler.webpack.dependencies
    //   .ModuleDependency {
    //   constructor(request: string) {
    //     super(request);
    //   }

    //   get type() {
    //     return "container-reference";
    //   }
    // }

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
          "var seenContainers = new Set();",
          "// this function allows you to load federated modules through react server component decoding",
          `${RuntimeGlobals.ensureChunk} = ${runtimeTemplate.basicFunction(
            ["chunkId"],
            [
              "if (typeof chunkId === 'string' && chunkId.startsWith('rsc/remote/client/')) {",
              Template.indent([
                `let existing = ${RuntimeGlobals.moduleCache}[chunkId];`,
                "if (existing)",
                "if (existing.loaded) return Promise.resolve();",
                "else existing.promise;",
                "let splitIndex = chunkId.indexOf(':', 18);",
                "let remote = chunkId.slice(0, splitIndex);",
                "let remoteModuleId = remote.slice(18);",
                "let [exposed] = chunkId.slice(splitIndex + 1).split('#');",
                "console.log(__webpack_require__.federation);",
                `${RuntimeGlobals.moduleCache}[chunkId] = {`,
                Template.indent([
                  "id: chunkId,",
                  "loaded: false,",
                  "exports: {},",
                ]),
                `};`,
                `return __webpack_require__.federation.runtime.loadRemote(remoteModuleId + "/" + exposed).then((mod) => {`,
                Template.indent(["console.log(mod.runtime.get);"]),
                `});`,

                // "let promises = [ogEnsureChunk(remote)];",
                // // `${RuntimeGlobals.ensureChunkHandlers}.remotes(remote, promises);`,
                // `return Promise.all(promises).then(${runtimeTemplate.basicFunction(
                //   ["r"],
                //   [
                //     `return ${RuntimeGlobals.require}("webpack/container/reference/" + remoteModuleId);`,
                //   ]
                // )}).then(${runtimeTemplate.basicFunction(
                //   ["container"],
                //   ["return container.get(exposed);"]
                // )}).then(${runtimeTemplate.basicFunction(
                //   ["factory"],
                //   [
                //     "var mod = factory();",
                //     `Object.assign(${RuntimeGlobals.moduleCache}[chunkId].exports, mod);`,
                //   ]
                // )});`,
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
          for (const mod of modules as webpack.NormalModule[]) {
            if (
              mod.userRequest &&
              mod.userRequest.startsWith("webpack/container/")
            ) {
              compilation.chunkGraph.setModuleId(mod, mod.userRequest);
            }
          }
        });
        compilation.hooks.optimizeChunks.tap("MyPlugin", (chunks) => {
          for (const chunk of chunks) {
            if (
              chunk.name &&
              compilation.chunkGraph
                .getChunkModules(chunk)
                .some((mod) => mod.type === "remote-module")
            ) {
              chunk.id = chunk.name;
            }
          }
        });

        // compilation.dependencyFactories.set(
        //   ContainerReferenceDependency,
        //   normalModuleFactory
        // );
        // compilation.dependencyTemplates.set(
        //   ContainerReferenceDependency,
        //   new compiler.webpack.dependencies.NullDependency.Template()
        // );

        // const handler = (parser: any) => {
        //   parser.hooks.program.tap("MyPlugin", (ast: any) => {
        //     const mod =
        //       /** @type {import("webpack").NormalModule} */ parser.state.module;

        //     if (mod.resource !== rsdResource) return;

        //     let attached = 0;
        //     for (const plugin of plugins) {
        //       if (plugin._options.remotes) {
        //         for (const key of Object.keys(plugin._options.remotes)) {
        //           attached++;
        //           const name = `rsc/remote/client/${key}`;
        //           const block = new compiler.webpack.AsyncDependenciesBlock(
        //             {
        //               name,
        //             },
        //             null,
        //             name
        //           );
        //           block.addDependency(new ContainerReferenceDependency(key));

        //           mod.addBlock(block);
        //         }
        //       }
        //     }

        //     if (process.env.DEBUG === "1") {
        //       console.log(
        //         `ℹ ${compiler.options.name} attached ${attached} remotes to react-server-dom-webpack\n`
        //       );
        //     }
        //   });
        // };

        // normalModuleFactory.hooks.parser
        //   .for("javascript/auto")
        //   .tap("HarmonyModulesPlugin", handler);

        // normalModuleFactory.hooks.parser
        //   .for("javascript/esm")
        //   .tap("HarmonyModulesPlugin", handler);

        // normalModuleFactory.hooks.parser
        //   .for("javascript/dynamic")
        //   .tap("HarmonyModulesPlugin", handler);

        /**
         *
         * @param {import("webpack").Chunk} chunk
         * @param {Set<string>} set
         */
        const requirementsHandler = (
          chunk: webpack.Chunk,
          set: Set<string>
        ) => {
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

// Below is from ModuleFederation / universe or somewhere like that and should probably be imported from there instead

export class ExternalTemplateRemotesPlugin {
  static PLUGIN_NAME = "ExternalTemplateRemotesPlugin";
  apply(compiler: webpack.Compiler) {
    compiler.hooks.make.tap(
      ExternalTemplateRemotesPlugin.PLUGIN_NAME,
      (compilation) => {
        const scriptExternalModules: webpack.ExternalModule[] = [];

        compilation.hooks.buildModule.tap(
          ExternalTemplateRemotesPlugin.PLUGIN_NAME,
          (m) => {
            const mod = m as webpack.ExternalModule;
            if (
              mod.constructor.name === "ExternalModule" &&
              mod.externalType === "script"
            ) {
              scriptExternalModules.push(mod);
            }
          }
        );
      }
    );
  }
}
