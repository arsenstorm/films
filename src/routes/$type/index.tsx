import {
	createFileRoute,
	type ErrorComponentProps,
	stripSearchParams,
} from "@tanstack/react-router";

import MediaGrid, {
	MediaGridErrorState,
	MediaGridLoadingState,
} from "@/components/media/grid";
import MoviesGrid from "@/components/movies-grid";
import SearchBar from "@/components/search-bar";
import TVShowsGrid from "@/components/tv-shows-grid";
import { getSafeRedirectPath } from "@/lib/auth";
import {
	type BrowsePageResult,
	getBrowseMediaLabel,
	loadBrowsePage,
} from "@/lib/browse";
import {
	type BrowseMediaType,
	type BrowseSearch,
	type BrowseView,
	DEFAULT_BROWSE_SEARCH,
	parseBrowseMediaType,
	parseBrowseSearch,
} from "@/lib/media";
import type { BrowseMediaItem } from "@/lib/tmdb";
import { requireAuthenticatedAccess } from "@/server/auth";

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

type BrowseLoaderDeps = Pick<BrowseSearch, "page" | "q" | "view">;

export const Route = createFileRoute("/$type/")({
	beforeLoad: ({ location }) => {
		return requireAuthenticatedAccess(
			getSafeRedirectPath(`${location.pathname}${location.searchStr}`)
		);
	},
	validateSearch: parseBrowseSearch,
	loaderDeps: ({ search }): BrowseLoaderDeps => {
		return {
			page: search.page,
			q: search.q,
			view: search.view,
		};
	},
	loader: ({ deps, params }): Promise<BrowsePageResult> => {
		return loadBrowsePage({
			page: deps.page,
			query: deps.q,
			type: parseBrowseMediaType(params.type),
			view: deps.view,
		});
	},
	component: MediaBrowsePage,
	errorComponent: MediaBrowseRouteError,
	head: ({ loaderData, params }) => {
		return {
			meta: [
				{
					title: getBrowseTitle(
						loaderData?.browseType ?? parseBrowseMediaType(params.type),
						loaderData?.view ?? DEFAULT_BROWSE_SEARCH.view
					),
				},
			],
		};
	},
	pendingComponent: MediaBrowsePendingState,
	search: {
		middlewares: [stripSearchParams(DEFAULT_BROWSE_SEARCH)],
	},
	ssr: "data-only",
});

function MediaBrowseLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="min-h-screen bg-zinc-100 p-6 pt-2 dark:bg-zinc-950">
			<header className="mb-2 flex h-16 items-center">
				<SearchBar />
			</header>
			{children}
		</main>
	);
}

function BrowseGrid({
	data,
	searchQuery,
}: {
	data: BrowsePageResult;
	searchQuery: string;
}) {
	switch (data.browseType) {
		case "movies":
			return (
				<MoviesGrid
					data={data.browsePage}
					searchQuery={searchQuery}
					view={data.view}
				/>
			);
		case "tv":
			return (
				<TVShowsGrid
					data={data.browsePage}
					searchQuery={searchQuery}
					view={data.view}
				/>
			);
		default:
			return (
				<MediaGrid<BrowseMediaItem>
					data={data.browsePage}
					mediaLabel={getBrowseMediaLabel(data.browseType, data.view)}
					resolveItemType={(item) => item.mediaType}
					searchQuery={searchQuery}
					view={data.view}
				/>
			);
	}
}

function MediaBrowsePage() {
	const loaderData = Route.useLoaderData();
	const { q } = Route.useSearch();

	if (!loaderData) {
		return null;
	}

	return (
		<MediaBrowseLayout>
			<BrowseGrid data={loaderData} searchQuery={q} />
		</MediaBrowseLayout>
	);
}

function MediaBrowsePendingState() {
	return (
		<MediaBrowseLayout>
			<MediaGridLoadingState />
		</MediaBrowseLayout>
	);
}

function MediaBrowseRouteError({ error }: ErrorComponentProps) {
	const { type } = Route.useParams();
	const { view } = Route.useSearch();
	const mediaLabel = getBrowseMediaLabel(parseBrowseMediaType(type), view);
	const errorMessage =
		error instanceof Error ? error.message : `Failed to fetch ${mediaLabel}`;

	return (
		<MediaBrowseLayout>
			<MediaGridErrorState
				errorMessage={errorMessage}
				mediaLabel={mediaLabel}
			/>
		</MediaBrowseLayout>
	);
}
