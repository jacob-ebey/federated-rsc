import * as path from "node:path";

import type * as webpack from "webpack";
import extractUrlAndGlobal from "webpack/lib/util/extractUrlAndGlobal";
import { RawSource } from "webpack-sources";
//@ts-ignore
import {ModuleFederationPlugin} from '@module-federation/enhanced'
import { exposedNameFromResource } from "./utils";

export class ServerRSCPlugin {
  constructor(private clientModules: Set<string>) {}

  apply(compiler: webpack.Compiler) {
    const clientModules = this.clientModules;
    compiler.hooks.thisCompilation.tap(
      "MyPlugin",
      (compilation, { normalModuleFactory }) => {
        const handler = (parser: any) => {
          parser.hooks.program.tap("MyPlugin", (ast: any) => {
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
  constructor(
    private options: {
      clientModules: Set<string>;
      cwd: string;
      rsdResource: string;
      libraryType: string;
      containerName: string;
      howToLoad: string;
      shared: any;
    }
  ) {}

  apply(compiler: webpack.Compiler) {
      compiler.webpack.library.EnableLibraryPlugin.setEnabled(compiler, 'script')
    const isServer = this.options.libraryType !== "var";
     const userPlugin = compiler.options.plugins.find((p: any) => p.name === 'ModuleFederationPlugin')
      //@ts-ignore
      const userOptions = userPlugin?._options;
    const clientRSCContainer =
      new ModuleFederationPlugin(
        {
          // isServer,
          name: this.options.containerName,
          exposes: Array.from(this.options.clientModules).reduce(
            (p, c) =>
              Object.assign(p, {
                [exposedNameFromResource(this.options.cwd, c)]: c,
              }),
            {}
          ),
          remotes: {
              ...userOptions?.remotes,
            [this.options.containerName]: this.options.howToLoad,
          },
            runtimePlugins:[
                require.resolve('./runtimePlugin')
            ],
          shared: this.options.shared,
          remoteType: this.options.libraryType === 'var' ? 'script' : 'commonjs-static',
          library: this.options.libraryType
            ? {
                name:
                  this.options.libraryType === "var"
                    ? this.options.containerName
                    : undefined,
                type: this.options.libraryType,
              }
            : undefined,
        }
      );
    clientRSCContainer.apply(compiler);

    // if (isServer) {
    //   new StreamingTargetPlugin({
    //     // name: this.containerName,
    //   }).apply(compiler);
    // }

    class ContainerReferenceDependency extends compiler.webpack.dependencies
      .ModuleDependency {
      constructor(request: string) {
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
                "let promises = [ogEnsureChunk(remote)];",
                `${RuntimeGlobals.moduleCache}[chunkId] = {
                  id: chunkId,
                  loaded: false,
                  exports: {},
                };`,
                // `${RuntimeGlobals.ensureChunkHandlers}.remotes(remote, promises);`,
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
                    `Object.assign(${RuntimeGlobals.moduleCache}[chunkId].exports, mod);`,
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

        compilation.dependencyFactories.set(
          ContainerReferenceDependency,
          normalModuleFactory
        );
        compilation.dependencyTemplates.set(
          ContainerReferenceDependency,
          new compiler.webpack.dependencies.NullDependency.Template()
        );

        const handler = (parser: any) => {
          parser.hooks.program.tap("MyPlugin", (ast: any) => {
            const mod =
              /** @type {import("webpack").NormalModule} */ parser.state.module;

            if (mod.resource !== this.options.rsdResource) return;

            const plugins = [clientRSCContainer];
            for (const plugin of compiler.options.plugins) {
              if (
                plugin &&
                (plugin.constructor.name === "ModuleFederationPlugin" ||
                  plugin.constructor.name === "UniversalFederationPlugin")
              ) {
                // @ts-ignore
                plugins.push(plugin);
              }
            }

            let attached = 0;
            for (const plugin of plugins) {
              // @ts-ignore
              if (plugin._options.remotes) {
                // @ts-ignore
                for (const key of Object.keys(plugin._options.remotes)) {
                  attached++;
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

            if (process.env.DEBUG === "1") {
              console.debug(
                `Attached ${attached} remotes to react-server-dom-webpack`
              );
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

        // compilation.hooks.afterCodeGeneration.tap(
        //   ExternalTemplateRemotesPlugin.PLUGIN_NAME,
        //   function () {
        //     scriptExternalModules.forEach((mod) => {
        //       const urlTemplate = extractUrlAndGlobal(mod.request)[0];
        //       const urlExpression = urlTemplate
        //       const sourceMap =
        //         // @ts-expect-error
        //         compilation.codeGenerationResults.get(mod).sources;
        //       const rawSource = sourceMap.get("javascript");
        //       sourceMap.set(
        //         "javascript",
        //         // @ts-expect-error
        //         new RawSource(
        //           (rawSource?.source().toString() || "").replace(
        //             `"${urlTemplate}"`,
        //             urlExpression
        //           )
        //         )
        //       );
        //     });
        //   }
        // );
      }
    );
  }
}

function toExpression(templateUrl: string) {
  const result = [];
  const current = [];
  let isExpression = false;
  let invalid = false;
  for (const c of templateUrl) {
    if (c === "[") {
      if (isExpression) {
        invalid = true;
        break;
      }
      isExpression = true;
      if (current.length) {
          //@ts-ignore
        result.push(`"${current.join("")}"`);
        current.length = 0;
      }
    } else if (c === "]") {
      if (!isExpression) {
        invalid = true;
        break;
      }
      isExpression = false;
      if (current.length) {
          //@ts-ignore
        result.push(`${current.join("")}`);
        current.length = 0;
      }
      current.length = 0;
    } else {
        //@ts-ignore
      current.push(c);
    }
  }
  if (isExpression || invalid) {
    throw new Error(`Invalid template URL "${templateUrl}"`);
  }
  if (current.length) {
      //@ts-ignore
    result.push(`"${current.join("")}"`);
  }
  return result.join(" + ");
}
