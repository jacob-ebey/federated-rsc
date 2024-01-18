import { RSCFrame } from "framework";

declare global {
	// biome-ignore lint/style/noVar: <explanation>
	var __REMOTES__: Record<string, string>;
}

const REMOTES = __REMOTES__;

export function FederatedRSCFrame({
	children,
	remote,
	url,
}: {
	children?: React.ReactNode;
	remote: string;
	url: string;
}) {
	const baseURL = REMOTES[remote];
	if (!baseURL) throw new Error(`No remote found for ${remote}`);

	const inputURL = new URL(url, baseURL);
	const frameURL = new URL(inputURL.pathname + inputURL.search, baseURL);

	return <RSCFrame url={frameURL}>{children}</RSCFrame>;
}
