import * as fsp from "node:fs/promises";
import * as path from "node:path";
import fg from "fast-glob";

function indent(lines, indentLevel = 0) {
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

export async function generate(outFile, routesDir) {
  outFile = path.resolve(outFile);
  const outDir = path.dirname(outFile);

  const routeFiles = await fg("*/*route.{ts,tsx,js,jsx}", {
    cwd: routesDir,
    onlyFiles: true,
  });

  const routeIds = [];
  const routes = {};
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
      rootRoutes.push(route);
    }
  }

  const createRouteRecursive = (route, parentPath = "/") => {
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

function makeRouteIdFromRouteFile(routeFile) {
  const ext = path.extname(routeFile);
  const base = routeFile.slice(0, -ext.length);
  return base.replace(/\\/g, "/").replace(/\/route$/, "");
}

function makePathnameFromRouteId(routeId) {
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
