import { getURL, type RouteProps } from "framework";

import { FederatedRSCFrame } from "../../remotes";

export async function Component({ params: { handle } }: RouteProps<"handle">) {
	const url = getURL();

	return (
		<FederatedRSCFrame
			remote="_fixture_marketing"
			url={`/product/${handle}${url.search}`}
		/>
	);
}
