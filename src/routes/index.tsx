import { createFileRoute } from "@tanstack/react-router";

import LandingPage from "@/components/landing/page";
import { getMarqueeMoviesFn } from "@/server/tmdb";

export const Route = createFileRoute("/")({
	component: LandingRoute,
	head: () => ({
		meta: [
			{
				title: "Film Tracker | Films",
			},
			{
				name: "description",
				content:
					"Track movies and TV shows, search by title, save a watchlist, mark favourites and watched titles, and compare streaming, rental, and purchase options by country.",
			},
		],
	}),
	loader: async () => {
		const popularMovies = await getMarqueeMoviesFn().catch(() => []);

		return {
			popularMovies,
		};
	},
	ssr: "data-only",
});

function LandingRoute() {
	const { popularMovies } = Route.useLoaderData();

	return <LandingPage popularMovies={popularMovies} />;
}
