import { StarIcon } from "@radix-ui/react-icons";

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

export function ProductImages() {
	return (
		<>
			<div className="hidden flex-col gap-3 items-start md:flex">
				<button
					type="button"
					className="overflow-hidden rounded-lg border transition-colors hover:border-gray-900 dark:hover:border-gray-50"
				>
					<img
						alt="Preview thumbnail"
						className="aspect-[5/6] object-cover"
						height={120}
						src="/placeholder.svg"
						width={100}
					/>
					<span className="sr-only">View Image 1</span>
				</button>
				<button
					type="button"
					className="overflow-hidden rounded-lg border transition-colors hover:border-gray-900 dark:hover:border-gray-50"
				>
					<img
						alt="Preview thumbnail"
						className="aspect-[5/6] object-cover"
						height={120}
						src="/placeholder.svg"
						width={100}
					/>
					<span className="sr-only">View Image 3</span>
				</button>
				<button
					type="button"
					className="overflow-hidden rounded-lg border transition-colors hover:border-gray-900 dark:hover:border-gray-50"
				>
					<img
						alt="Preview thumbnail"
						className="aspect-[5/6] object-cover"
						height={120}
						src="/placeholder.svg"
						width={100}
					/>
					<span className="sr-only">View Image 4</span>
				</button>
				<button
					type="button"
					className="overflow-hidden rounded-lg border transition-colors hover:border-gray-900 dark:hover:border-gray-50"
				>
					<img
						alt="Preview thumbnail"
						className="aspect-[5/6] object-cover"
						height={120}
						src="/placeholder.svg"
						width={100}
					/>
					<span className="sr-only">View Image 4</span>
				</button>
			</div>
			<div className="md:col-span-4">
				<img
					alt="Product"
					className="aspect-[2/3] object-cover border border-gray-200 w-full rounded-lg overflow-hidden dark:border-gray-800"
					height={900}
					src="/placeholder.svg"
					width={600}
				/>
			</div>
		</>
	);
}
