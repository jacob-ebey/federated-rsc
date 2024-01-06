// @ts-expect-error - no types
import extractUrlAndGlobal from "webpack/lib/util/extractUrlAndGlobal.js";
import webpackSources from "webpack-sources";
const { RawSource } = webpackSources;

const PLUGIN_NAME = "ExternalTemplateRemotesPlugin";

export class ExternalTemplateRemotesPlugin {
  /**
   *
   * @param {import("webpack").Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.make.tap(PLUGIN_NAME, (compilation) => {
      /** @type {import("webpack").ExternalModule[]} */
      const scriptExternalModules = [];

      compilation.hooks.buildModule.tap(PLUGIN_NAME, (m) => {
        const module = /** @type {import("webpack").ExternalModule} */ (m);
        if (
          module.constructor.name === "ExternalModule" &&
          module.externalType === "script"
        ) {
          scriptExternalModules.push(module);
        }
      });

      compilation.hooks.afterCodeGeneration.tap(PLUGIN_NAME, function () {
        scriptExternalModules.forEach((module) => {
          const urlTemplate = extractUrlAndGlobal(module.request)[0];
          const urlExpression = toExpression(urlTemplate);
          const sourceMap =
            // @ts-expect-error
            compilation.codeGenerationResults.get(module).sources;
          const rawSource = sourceMap.get("javascript");
          sourceMap.set(
            "javascript",
            // @ts-expect-error
            new RawSource(
              (rawSource?.source().toString() || "").replace(
                `"${urlTemplate}"`,
                urlExpression
              )
            )
          );
        });
      });
    });
  }
}

/**
 * @param {string} templateUrl
 * @returns
 */
function toExpression(templateUrl) {
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
        result.push(`${current.join("")}`);
        current.length = 0;
      }
      current.length = 0;
    } else {
      current.push(c);
    }
  }
  if (isExpression || invalid) {
    throw new Error(`Invalid template URL "${templateUrl}"`);
  }
  if (current.length) {
    result.push(`"${current.join("")}"`);
  }
  return result.join(" + ");
}
