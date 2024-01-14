import {
	registerClientReference as registerClientReferenceImp,
	registerServerReference as registerServerReferenceImp,
} from "framework/react.server";

export function registerClientReference(
	proxy: unknown,
	mod: string,
	exp: string,
) {
	registerClientReferenceImp(proxy, mod, exp);
	return proxy;
}

export function registerServerReference(
	proxy: unknown,
	mod: string,
	exp: string,
) {
	registerServerReferenceImp(proxy, mod, exp);
	return proxy;
}
