import * as React from "react";

import { getURL } from "framework";

import { Input } from "@/components/ui/input";

import { AddToCartButton, Option } from "./client";

export function AddToCartForm({
	options,
}: {
	options: {
		id: string;
		name: string;
		values: string[];
	}[];
}) {
	const url = getURL();
	const pathname = url.pathname;

	return (
		<form className="grid gap-4 md:gap-10">
			{options.map((option) => {
				return (
					<React.Fragment key={option.id}>
						<p className="text-lg">{option.name}</p>
						<Option option={option} pathname={pathname} />
					</React.Fragment>
				);
			})}

			<div className="grid gap-2">
				<p className="text-lg">Quantity</p>
				<Input
					id="quantity"
					name="quantity"
					type="number"
					min={0}
					max={255}
					defaultValue={1}
				/>
			</div>

			<AddToCartButton />
		</form>
	);
}
