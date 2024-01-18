import * as path from "node:path";

export function exposedNameFromResource(cwd: string, resource: string) {
	const relative = path.relative(cwd, resource).replace(/\\/g, "/");

	// TODO: Check if in node_modules and make a deterministic ID
	if (relative === "../../framework/dist/framework.client.internal.js") {
		return "framework/client.internal";
	}

	return `./${relative.replace(/\.\.\//g, "__/")}`;
}
