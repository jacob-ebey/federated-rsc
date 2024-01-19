export async function addToCart() {
	"use server";
	console.log("Adding to cart!");
	await new Promise((resolve) => setTimeout(resolve, 1000));
	console.log("Added to cart!");

	return "Added to cart!";
}
