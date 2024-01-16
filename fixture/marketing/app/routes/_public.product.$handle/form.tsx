import * as React from "react";

import { getURL } from "framework";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Option } from "./client";

export function AddToCartForm({
	options,
	selectedOptions,
}: {
	options: {
		id: string;
		name: string;
		values: string[];
	}[];
	selectedOptions: Record<string, string>;
}) {
	const url = getURL();
	const pathname = url.pathname;

	return (
		<form className="grid gap-4 md:gap-10">
			{options.map((option) => {
				return (
					<React.Fragment key={option.id}>
						<Label className="text-base" htmlFor="color">
							{option.name}
						</Label>
						<Option
							option={option}
							pathname={pathname}
							selectedOption={selectedOptions[option.name]}
						/>
					</React.Fragment>
				);
			})}

			<div className="grid gap-2">
				<Label className="text-base" htmlFor="quantity">
					Quantity
				</Label>
				<Input
					id="quantity"
					name="quantity"
					type="number"
					min={0}
					max={255}
					defaultValue={1}
				/>
			</div>

			<Button size="lg">Add to cart</Button>
		</form>
	);
}
