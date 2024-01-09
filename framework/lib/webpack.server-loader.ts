import * as path from "node:path";

import type * as webpack from "webpack";
import oxc from "@oxidation-compiler/napi";

import { exposedNameFromResource } from "./utils";

/**
 * @type {import("webpack").LoaderDefinitionFunction}
 */
export default async function (
  this: webpack.LoaderContext<{ containerName: string; cwd: string }>,
  source: string
) {
  const cb = this.async();
  const resourcePath = this.resourcePath;
  const { containerName, cwd } = this.getOptions();
  const meta = await parseRSCMetadata(source, resourcePath, cwd, containerName);

  if (meta.useClient) {
    source = createClientModule(meta.moduleExports);
  }

  cb(null, source);
}

async function parseRSCMetadata(
  source: string,
  filePath: string,
  cwd: string,
  containerName: string
) {
  let parseResult = await oxc.parseAsync(source, {
    sourceFilename: filePath,
    sourceType: "module",
  });

  let program = JSON.parse(parseResult.program);
  let identifier =
    "rsc/remote/client/" +
    containerName +
    ":" +
    exposedNameFromResource(cwd, filePath);

  let useClient = false,
    useServer = false;
  for (const { directive } of program.directives) {
    if (directive === "use client") {
      useClient = true;
    } else if (directive === "use server") {
      useServer = true;
    }
  }

  if (!useClient && !useServer) {
    return {
      useClient: false,
      useServer: false,
    } as const;
  }

  if (useClient && useServer) {
    throw new Error(
      `Cannot use both 'use client' and 'use server' in the same module`
    );
  }

  let moduleExports = [];
  for (let node of program.body) {
    // Commonjs static exports.xyz = ...
    if (
      node.type === "ExpressionStatement" &&
      node.expression.type === "AssignmentExpression" &&
      node.expression.operator === "=" &&
      node.expression.left.type === "StaticMemberExpression" &&
      node.expression.left.object.type === "IdentifierReference" &&
      node.expression.left.object.name === "exports" &&
      node.expression.left.property.type === "IdentifierName"
    ) {
      let name = node.expression.left.property.name;
      moduleExports.push({
        identifier,
        localName: name,
        publicName: name,
      });
    }

    // Handle FunctionDeclaration exports
    if (
      node.type === "ExportNamedDeclaration" &&
      (node.declaration?.type === "FunctionDeclaration" ||
        node.declaration?.type === "ClassDeclaration")
    ) {
      let name = node.declaration.id.name;
      moduleExports.push({
        identifier,
        localName: name,
        publicName: name,
      });
    }

    // Handle export specifiers (named exports)
    if (node.type === "ExportNamedDeclaration" && node.specifiers.length > 0) {
      for (const specifier of node.specifiers) {
        let localName = specifier.local.name;
        let publicName = specifier.exported.name;
        moduleExports.push({
          identifier,
          localName,
          publicName,
        });
      }
    }

    // Handle default exports
    if (node.type === "ExportDefaultDeclaration") {
      if (!node.declaration.id) {
        throw new Error(`Cannot export anonymous default export`);
      }

      let name = node.declaration.id.name;
      moduleExports.push({
        identifier,
        localName: name,
        publicName: "default",
      });
    }
  }

  return {
    useClient,
    useServer,
    moduleExports,
  } as
    | { useClient: true; useServer: false; moduleExports: typeof moduleExports }
    | {
        useClient: false;
        useServer: true;
        moduleExports: typeof moduleExports;
      };
}

function createClientModule(
  moduleExports: Array<{ publicName: string; identifier: string }>
) {
  let code = "'use client';\n";

  let seen = new Set();
  for (const { publicName, identifier } of moduleExports) {
    if (seen.has(publicName)) {
      continue;
    }
    seen.add(publicName);

    const serverReference = `{
      $$typeof: Symbol.for('react.client.reference'),
      $$id: ${JSON.stringify(identifier + "#" + publicName)},
			$$async: true,
    }`;

    if (publicName === "default") {
      code += `
        export default ${serverReference};
      `;
    } else {
      code += `
        export const ${publicName} = ${serverReference};
      `;
    }
  }

  return code;
}
