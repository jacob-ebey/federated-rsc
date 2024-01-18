"use client";

import { useLocation } from "framework/client";

import { Button } from "@/components/ui/button";

export function AddToCartButton() {
	const location = useLocation();

	return (
		<Button size="lg" disabled={location.state !== "idle"}>
			Add to cart
		</Button>
	);
}

export function Option({
	option,
	pathname,
}: {
	option: {
		id: string;
		name: string;
		values: string[];
	};
	pathname: string;
}) {
	const location = useLocation();

	const selectedOptions = new URLSearchParams(
		location.state === "transitioning" &&
			location.url.pathname === location.to.pathname
			? location.to.search
			: location.url.search,
	);

	const selectedValue = selectedOptions.get(option.name);

	return (
		<>
			{option.values.map((value) => {
				const searchParams = new URLSearchParams(selectedOptions);
				searchParams.set(option.name, value);
				return (
					<Button
						asChild
						key={value}
						size="sm"
						variant={value === selectedValue ? "default" : "outline"}
					>
						<a href={`${pathname}?${searchParams.toString()}`}>{value}</a>
					</Button>
				);
			})}
		</>
	);
}
