import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import MoviesGrid from "@/components/movies-grid";
import SearchBar from "@/components/search-bar";
import TVShowsGrid from "@/components/tv-shows-grid";
import { getSafeRedirectPath } from "@/lib/auth";
import {
	type BrowseView,
	DEFAULT_BROWSE_SEARCH,
	type MediaType,
	parseBrowseSearch,
} from "@/lib/media";
import { requireAuthenticatedAccess } from "@/server/auth";

function getBrowseTitle(mediaType: MediaType, view: BrowseView): string {
	const mediaLabel = mediaType === "movies" ? "Movies" : "TV Shows";

	switch (view) {
		case "watchlist":
			return `${mediaLabel} Watchlist | Films`;
		case "favorites":
			return `Favourite ${mediaLabel} | Films`;
		case "watched":
			return `Watched ${mediaLabel} | Films`;
		default:
			return `${mediaLabel} | Films`;
	}
}

export const Route = createFileRoute("/$type/")({
	beforeLoad: async ({ location }) => {
		await requireAuthenticatedAccess(
			getSafeRedirectPath(`${location.pathname}${location.searchStr}`)
		);
	},
	component: MediaBrowsePage,
	head: ({ params, loaderData }) => ({
		meta: [
			{
				title: getBrowseTitle(
					params.type as MediaType,
					(loaderData as unknown as { view: BrowseView })?.view
				),
			},
		],
	}),
	loader: ({ location }) => {
		const view =
			"view" in location.search
				? (location.search.view as BrowseView)
				: DEFAULT_BROWSE_SEARCH.view;
		return {
			view,
		};
	},
	search: {
		middlewares: [stripSearchParams(DEFAULT_BROWSE_SEARCH)],
	},
	validateSearch: parseBrowseSearch,
});

function MediaBrowsePage() {
	const { type } = Route.useParams();
	const { page, q, view } = Route.useSearch();

	return (
		<main className="min-h-screen bg-zinc-100 p-6 pt-2 dark:bg-zinc-950">
			<header className="mb-2 flex h-16 items-center">
				<SearchBar />
			</header>
			{type === "movies" ? (
				<MoviesGrid page={page} searchQuery={q} view={view} />
			) : (
				<TVShowsGrid page={page} searchQuery={q} view={view} />
			)}
		</main>
	);
}
