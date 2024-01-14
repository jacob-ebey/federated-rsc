export function Component() {
	return <h1>Product Page</h1>;
}

const query = `
  query Product($selectedOptions: [SelectedOptionInput!]!) {
    product(handle: "men-crewneck") {
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
