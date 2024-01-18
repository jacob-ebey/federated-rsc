import { Link, getURL } from "framework";

import { FederatedRSCFrame } from "../../remotes";

import styleFile from "./style.css";

export function Component({ children }: { children?: React.ReactNode }) {
	const url = getURL();

	const styleHref = new URL(`/dist/server/${styleFile}`, url).href;

	const toRender = (
		<>
			<Link rel="stylesheet" href={styleHref} />
			{children}
		</>
	);

	if (url.searchParams.get("noshell")) {
		return toRender;
	}

	return (
		<FederatedRSCFrame remote="_fixture_shell" url="/api/shell">
			{toRender}
		</FederatedRSCFrame>
	);
}
