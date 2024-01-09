import * as path from "node:path";

export function exposedNameFromResource(cwd: string, resource: string) {
  const relative = path.relative(cwd, resource).replace(/\\/g, "/");
  return "./" + relative.replace(/\.\.\//g, "__/");
}
