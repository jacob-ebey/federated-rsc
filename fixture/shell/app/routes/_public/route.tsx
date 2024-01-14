import { getURL } from "framework";

import { Header } from "./header";
import styleFile from "./style.css";

export function Component({ children }: { children: React.ReactNode }) {
	const url = getURL();

	const styleHref = new URL(`/dist/server/${styleFile}`, url).href;

	return (
		<html lang="en" className="bg-background text-foreground">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>YAY!</title>
				<link rel="stylesheet" href={styleHref} />
			</head>
			<body className="bg-background text-foreground">
				<Header />
				{children}
			</body>
		</html>
	);
}
