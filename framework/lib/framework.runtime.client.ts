import { registerServerReference as registerServerReferenceImp } from "framework/react.client";

export function registerServerReference(
	proxy: unknown,
	mod: string,
	exp: string,
) {
	return registerServerReferenceImp(proxy, mod, exp);
}
