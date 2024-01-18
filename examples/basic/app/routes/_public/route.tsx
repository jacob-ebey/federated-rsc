import { getHeaders, getURL } from "framework";

export function Component({ children }: { children: React.ReactNode }) {
	const headers = getHeaders();
	const url = getURL();

	const renderedForHost = headers.get("X-Forwarded-For-Host") || url.host;
	const renderedForURL = new URL(url);
	renderedForURL.host = renderedForHost;
	const renderedFor = renderedForURL.href;

	return (
		<html lang="en">
			<head>
				<title>My App</title>
			</head>
			<body style={{ backgroundColor: "pink", padding: "1rem" }}>
				<header>
					<nav>
						<ul>
							<li>
								<a href="/">Home</a>
							</li>
							<li>
								<a href="/about">About</a>
							</li>
							<li>
								<a href="/about/sub">About Sub</a>
							</li>
							<li>
								<a href="/not-found">Not Found</a>
							</li>
						</ul>
					</nav>
					<p>RENDERED FOR: {renderedFor}</p>
				</header>
				{children}
			</body>
		</html>
	);
}
