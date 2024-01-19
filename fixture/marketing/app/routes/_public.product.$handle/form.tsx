import { getURL } from "framework";

import { Input } from "@/components/ui/input";

import { addToCart } from "./actions";
import { AddToCartButton, Option } from "./client";

export function AddToCartForm({
	message,
	options,
	selectedVariantId,
}: {
	message?: React.ReactNode;
	options: {
		id: string;
		name: string;
		values: string[];
	}[];
	selectedVariantId?: string;
}) {
	const url = getURL();

	return (
		<form
			action={async () => {
				const result = await addToCart();
				console.log({ result });
			}}
			className="grid gap-4 md:gap-10"
		>
			{options.map((option) => {
				return (
					<Option key={option.id} option={option} pathname={url.pathname} />
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

			<AddToCartButton disabled={!selectedVariantId} />

			{message}
		</form>
	);
}
