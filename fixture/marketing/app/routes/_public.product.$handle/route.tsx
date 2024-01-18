import { RouteProps, getURL } from "framework";

import { Separator } from "@/components/ui/separator";
import { AddToCartForm } from "./form";
import { ProductHeader, ProductImages } from "./product";
import { ProductReviews } from "./reviews";

export async function Component({ params: { handle } }: RouteProps<"handle">) {
	const variables = {
		handle,
		selectedOptions: [],
	};

	const url = new URL("https://mock.shop/api");
	url.searchParams.set("query", query);
	url.searchParams.set("variables", JSON.stringify(variables));
	const request = await fetch(url);
	const response = await request.json();

	const product = response.data?.product;
	if (!product) {
		throw new Error("No product");
	}

	const header = (
		<ProductHeader
			title={product.title}
			description={product.description}
			priceRange={product.priceRange}
		/>
	);

	return (
		<div className="container grid gap-6 items-start py-6 md:grid-cols-2 lg:gap-12">
			<div className="grid gap-3 items-start md:grid-cols-5">
				<div className="md:hidden">{header}</div>
				<ProductImages />
			</div>
			<div className="grid gap-4 items-start md:gap-10">
				<div className="hidden md:block">{header}</div>
				<AddToCartForm options={product.options} />
				<Separator />
				<ProductReviews />
			</div>
		</div>
	);
}

const query = `
  query Product($handle: String, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      id
      title
      description
      featuredImage {
        id
        url
      }
      priceRange {
        maxVariantPrice {
          amount
        }
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        edges {
          node {
            id
            url
            altText
          }
        }
      }
      variantBySelectedOptions(selectedOptions: $selectedOptions) {
        id
      }
      variants(first: 250) {
        edges {
          node {
            id
            price {
              amount
              currencyCode
            }
            image {
              id
              url
              altText
            }
          }
        }
      }
      options {
        id
        name
        values
      }
    }
  }
`;
