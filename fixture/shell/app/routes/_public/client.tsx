"use client";

import { useLocation } from "framework/client";

import { cn } from "@/lib/utils";

export function GlobalStatusIndicator() {
	const location = useLocation();
	const active = location.state === "transitioning";

	return (
		<div
			// biome-ignore lint/a11y/useAriaPropsForRole: <explanation>
			role="progressbar"
			aria-hidden={!active}
			aria-valuetext={active ? "Loading" : undefined}
			className="fixed inset-x-0 top-0 z-50 h-1 animate-pulse"
		>
			<div
				className={cn(
					"h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-in-out",
					active ? "w-full" : "w-0 opacity-0 transition-none",
				)}
			/>
		</div>
	);
}
