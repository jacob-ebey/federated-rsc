export function ProductHeader({
	title,
	description,
	priceRange,
}: {
	title: string;
	description?: string;
	priceRange: {
		maxVariantPrice: {
			amount: string;
		};
		minVariantPrice: {
			amount: string;
			currencyCode: string;
		};
	};
}) {
	let price = <span>${priceRange.minVariantPrice.amount}</span>;
	if (priceRange.maxVariantPrice.amount !== priceRange.minVariantPrice.amount) {
		price = (
			<span>
				{price} - <span>{priceRange.maxVariantPrice.amount}</span>
			</span>
		);
	}
	price = (
		<span>
			{price} <small>{priceRange.minVariantPrice.currencyCode}</small>
		</span>
	);

	return (
		<div className="flex items-start">
			<div className="grid gap-4">
				<h1 className="text-3xl font-bold lg:text-4xl">{title}</h1>
				<div>
					<p>{description}</p>
				</div>
			</div>
			<div className="ml-auto text-2xl font-bold">$99</div>
		</div>
	);
}
