import { ProductCard, ProductList } from "./products";

export async function Component() {
	const url = new URL("https://mock.shop/api");
	url.searchParams.set("query", query);
	const request = await fetch(url);
	const response = await request.json();

	if (!response.data) {
		throw new Error("No data");
	}

	return (
		<ProductList
			title={response.data.collection.title}
			description={response.data.collection.description}
		>
			{response.data.collection.products.edges.map(
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				({ node }: { node: any }) => (
					<ProductCard
						key={node.handle}
						handle={node.handle}
						title={node.title}
						description={node.description}
						image={node.featuredImage.url}
						price={node.priceRange.minVariantPrice}
					/>
				),
			)}
		</ProductList>
	);
}

const query = `{
	collection(id: "gid://shopify/Collection/429512622102") {
		id
		handle
		title
		description
		products(first: 20) {
			edges {
				node {
					handle
					title
					description
					featuredImage {
						url
					}
					priceRange {
						minVariantPrice {
							amount
							currencyCode
						}
					}
				}
			}
		}
	}
}`;
