"use client";

// import { useLocation } from "framework/client";

import { Label } from "@/components/ui/label";

export function Option({
	option,
	pathname,
	selectedOption,
}: {
	option: {
		id: string;
		name: string;
		values: string[];
	};
	pathname: string;
	selectedOption?: string;
}) {
	// const location = useLocation();
	// console.log(location);

	// const selectedOptions = new URLSearchParams(location.url.search);

	return (
		<>
			{option.values.map((value) => (
				<Label
					className="border cursor-pointer rounded-md p-2 flex items-center gap-2 [&:has(:checked)]:bg-muted dark:[&:has(:checked)]:bg-gray-800"
					htmlFor={`optionvalue-${option.name}-${value}`}
					key={value}
				>
					<a href={`${pathname}?`}>{value}</a>
				</Label>
			))}
		</>
	);
}
