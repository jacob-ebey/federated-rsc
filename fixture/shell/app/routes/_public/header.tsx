import { Button } from "@/components/ui/button";

export function Header() {
	return (
		<header className="w-full">
			<div className="container flex items-center justify-between py-4">
				<div className="flex items-center gap-4">
					<Button asChild variant="outline" size="icon">
						<a href="/">
							<img
								alt="Logo"
								className="h-8 w-auto"
								src="https://remix.run/favicon-32.png"
								width={32}
								height={32}
							/>
						</a>
					</Button>
					<nav className="flex gap-2">
						<Button asChild variant="link" size="sm">
							<a href="/shop">Shop</a>
						</Button>
						<Button asChild variant="link" size="sm">
							<a href="/about">About</a>
						</Button>
						<Button asChild variant="link" size="sm">
							<a href="/contact">Contact</a>
						</Button>
					</nav>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon">
						<span className="sr-only">Open Cart</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="w-4 h-4"
						>
							<title>Cart</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
							/>
						</svg>
					</Button>
				</div>
			</div>
		</header>
	);
}
