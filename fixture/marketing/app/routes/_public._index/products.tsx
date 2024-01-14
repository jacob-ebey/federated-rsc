import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function ProductList({
	children,
	description,
	title,
}: {
	children: React.ReactNode;
	description?: string;
	title?: string;
}) {
	return (
		<section className="w-full py-12 md:py-24 lg:py-32">
			<div className="container grid items-center justify-center gap-4 text-center">
				<div className="grid gap-12">
					{(title || description) && (
						<div className="grid gap-2">
							{title && (
								<h2 className="text-2xl font-bold tracking-tighter">{title}</h2>
							)}
							{description && (
								<p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
									{description}
								</p>
							)}
						</div>
					)}
					<div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
						{children}
					</div>
				</div>
			</div>
		</section>
	);
}

export function ProductCard({
	description,
	handle,
	image,
	price,
	title,
}: {
	description?: string;
	handle: string;
	image: string;
	price: { amount: string; currencyCode: string };
	title: string;
}) {
	return (
		<Card className="relative flex flex-col">
			<a className="absolute inset-0 z-10" href={`/product/${handle}`}>
				<span className="sr-only">View {title}</span>
			</a>
			<img
				loading="lazy"
				alt=""
				aria-hidden
				className="object-cover w-full aspect-square group-hover:opacity-50 transition-opacity"
				height={600}
				src={`${image}&width=400`}
				width={450}
			/>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			{description && (
				<CardContent>
					<CardDescription>{truncate(description, 100)}</CardDescription>
				</CardContent>
			)}
			<CardFooter className="mt-auto">
				<span className="inline-flex items-center gap-1">
					<span>${price.amount}</span>
					<span>{price.currencyCode}</span>
				</span>
			</CardFooter>
		</Card>
	);
}

function truncate(str: string, n: number) {
	return str.length > n ? `${str.slice(0, n - 1)}...` : str;
}
