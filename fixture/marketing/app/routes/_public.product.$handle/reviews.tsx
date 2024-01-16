import { StarIcon } from "@radix-ui/react-icons";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function ProductReviews() {
	return (
		<div className="grid gap-4">
			<h2 className="text-lg font-semibold">Product Reviews</h2>
			<div className="grid gap-4">
				<div className="flex gap-4 items-start">
					<Avatar className="w-10 h-10 border">
						<AvatarImage alt="@shadcn" src="/placeholder-user.jpg" />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
					<div className="grid gap-4">
						<div className="flex gap-4 items-start">
							<div className="grid gap-0.5 text-sm">
								<h3 className="font-semibold">Sarah Johnson</h3>
								<time className="text-sm text-gray-500 dark:text-gray-400">
									2 days ago
								</time>
							</div>
							<div className="flex items-center gap-0.5 ml-auto">
								<StarIcon className="w-5 h-5 fill-primary" />
								<StarIcon className="w-5 h-5 fill-primary" />
								<StarIcon className="w-5 h-5 fill-primary" />
								<StarIcon className="w-5 h-5 fill-muted stroke-muted-foreground" />
								<StarIcon className="w-5 h-5 fill-muted stroke-muted-foreground" />
							</div>
						</div>
						<div className="text-sm leading-loose text-gray-500 dark:text-gray-400">
							<p>
								I've been experimenting with my LuminaCook Multi-Function Air
								Fryer for a few weeks now, and it's been a versatile addition to
								my kitchen. It's great for making crispy fries, chicken wings,
								and even some healthier options.
							</p>
						</div>
					</div>
				</div>
				<Separator />
				<div className="flex gap-4 items-start">
					<Avatar className="w-10 h-10 border">
						<AvatarImage alt="@shadcn" src="/placeholder-user.jpg" />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
					<div className="grid gap-4">
						<div className="flex gap-4 items-start">
							<div className="grid gap-0.5 text-sm">
								<h3 className="font-semibold">Alex Smith</h3>
								<time className="text-sm text-gray-500 dark:text-gray-400">
									3 weeks ago
								</time>
							</div>
							<div className="flex items-center gap-0.5 ml-auto">
								<StarIcon className="w-5 h-5 fill-primary" />
								<StarIcon className="w-5 h-5 fill-primary" />
								<StarIcon className="w-5 h-5 fill-primary" />
								<StarIcon className="w-5 h-5 fill-muted stroke-muted-foreground" />
								<StarIcon className="w-5 h-5 fill-muted stroke-muted-foreground" />
							</div>
						</div>
						<div className="text-sm leading-loose text-gray-500 dark:text-gray-400">
							<p>
								I recently purchased the SparkleShine Home Cleaning Robot, and
								it has been a game-changer in my life. I used to spend hours
								every weekend cleaning my house, but now I can simply turn on
								this little robot and let it do the work. It's incredibly
								efficient, navigating around obstacles with ease. The only
								reason I didn't give it a perfect 5-star rating is that it
								occasionally gets stuck under low furniture. Overall, it's been
								a great addition to my home, saving me time and effort.
							</p>
						</div>
					</div>
				</div>
				<Separator />
				<div className="flex gap-4 items-start">
					<Avatar className="w-10 h-10 border">
						<AvatarImage alt="@shadcn" src="/placeholder-user.jpg" />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
					<div className="grid gap-4">
						<div className="flex gap-4 items-start">
							<div className="grid gap-0.5 text-sm">
								<h3 className="font-semibold">Emily Parker</h3>
								<time className="text-sm text-gray-500 dark:text-gray-400">
									2 days ago
								</time>
							</div>
							<div className="flex items-center gap-0.5 ml-auto">
								<StarIcon className="w-5 h-5 fill-primary" />
								<StarIcon className="w-5 h-5 fill-primary" />
								<StarIcon className="w-5 h-5 fill-muted stroke-muted-foreground" />
								<StarIcon className="w-5 h-5 fill-muted stroke-muted-foreground" />
								<StarIcon className="w-5 h-5 fill-muted stroke-muted-foreground" />
							</div>
						</div>
						<div className="text-sm leading-loose text-gray-500 dark:text-gray-400">
							<p>
								The battery life is impressive, lasting me for long-haul flights
								without any issues. They are comfortable to wear for extended
								periods, and I appreciate the sleek design. Worth every penny,
								and I'd recommend these headphones to anyone who values
								high-quality audio and peace and quiet.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
