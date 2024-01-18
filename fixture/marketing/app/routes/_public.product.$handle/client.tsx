"use client";

import { useLocation } from "framework/client";
import * as React from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddToCartButton() {
	const location = useLocation();
	const formStatus = useFormStatus();

	const diabled =
		formStatus.pending ||
		(location.state !== "idle" &&
			location.to.pathname === location.url.pathname);

	return (
		<Button size="lg" disabled={diabled}>
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
		<div>
			<p className="text-lg">{option.name}</p>
			<div className="flex flex-wrap gap-2">
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
			</div>
		</div>
	);
}

export function ProductImages({
	images,
}: {
	images: {
		id: string;
		url: string;
		altText: string;
	}[];
}) {
	const [selectedImage, setSelectedImage] = React.useState(images[0]);

	return (
		<>
			<div className="hidden flex-col gap-3 items-start md:flex relative">
				{images.map((image, index) => (
					<button
						key={image.id}
						type="button"
						className={cn(
							"overflow-hidden rounded-lg border-2 p-0.5 transition-colors w-full",
							{
								"border-secondary": image.id !== selectedImage.id,
							},
						)}
						onClick={() => setSelectedImage(image)}
					>
						<img
							loading="lazy"
							alt={image.altText}
							className="aspect-[5/6] object-cover w-full"
							src={`${image.url}&width=160`}
						/>
						<span className="sr-only">View Image {index + 1}</span>
					</button>
				))}
			</div>
			<div className="md:col-span-4">
				<img
					key={selectedImage.id}
					alt="Product"
					className="aspect-[2/3] object-cover border w-full rounded-lg overflow-hidden"
					src={`${selectedImage.url}&width=600`}
				/>
			</div>
		</>
	);
}
