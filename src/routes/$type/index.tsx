import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import MediaGrid from "@/components/media/grid";
import MoviesGrid from "@/components/movies-grid";
import SearchBar from "@/components/search-bar";
import TVShowsGrid from "@/components/tv-shows-grid";
import { getSafeRedirectPath } from "@/lib/auth";
import { fetchAllMedia } from "@/lib/browse";
import {
	type BrowseMediaType,
	type BrowseView,
	DEFAULT_BROWSE_SEARCH,
	parseBrowseMediaType,
	parseBrowseSearch,
} from "@/lib/media";
import type { BrowseMediaItem } from "@/lib/tmdb";
import { getSessionStateFn, requireAuthenticatedAccess } from "@/server/auth";

function getBrowseTitle(mediaType: BrowseMediaType, view: BrowseView): string {
	if (mediaType === "all") {
		switch (view) {
			case "watchlist":
				return "All Watchlist | Films";
			case "favorites":
				return "Favourite Titles | Films";
			case "watched":
				return "Watched Titles | Films";
			default:
				return "All Titles | Films";
		}
	}

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
					parseBrowseMediaType(params.type),
					(loaderData as unknown as { view: BrowseView })?.view
				),
			},
		],
	}),
	loader: async ({ location }) => {
		const view =
			"view" in location.search
				? (location.search.view as BrowseView)
				: DEFAULT_BROWSE_SEARCH.view;
		const { isSpecialUser } = await getSessionStateFn();
		return {
			isSpecialUser,
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
	const { isSpecialUser } = Route.useLoaderData();
	const { page, q, view } = Route.useSearch();
	const browseType = parseBrowseMediaType(type);
	let grid = <MoviesGrid page={page} searchQuery={q} view={view} />;

	if (browseType === "tv") {
		grid = <TVShowsGrid page={page} searchQuery={q} view={view} />;
	} else if (browseType === "all") {
		grid = (
			<MediaGrid<BrowseMediaItem>
				browseType="all"
				fetchItems={fetchAllMedia}
				mediaLabel={view === "discover" ? "titles" : `${view} titles`}
				page={page}
				resolveItemType={(item) => item.mediaType}
				searchQuery={q}
				view={view}
			/>
		);
	}

	return (
		<main className="min-h-screen bg-zinc-100 p-6 pt-2 dark:bg-zinc-950">
			<header className="mb-2 flex h-16 items-center">
				<SearchBar isSpecialUser={isSpecialUser} />
			</header>
			{grid}
		</main>
	);
}
