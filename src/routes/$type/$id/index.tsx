import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import MovieDetailsPage from "@/components/movie/details";
import ShowDetailsPage from "@/components/show/details";
import { getSafeRedirectPath } from "@/lib/auth";
import {
	DEFAULT_BROWSE_SEARCH,
	parseBrowseSearch,
	parseMediaType,
	parsePositiveId,
} from "@/lib/media";
import { getMediaTitle } from "@/lib/media-adapters";
import { requireAuthenticatedAccess } from "@/server/auth";
import { getMovieByIdFn, getShowByIdFn } from "@/server/tmdb";
import {
	getMediaTrackerStateFn,
	type MediaTrackerState,
} from "@/server/tracker";

type MediaDetailsLoaderData =
	| {
			mediaItem: Awaited<ReturnType<typeof getMovieByIdFn>>;
			mediaType: "movies";
			trackerState: MediaTrackerState;
	  }
	| {
			mediaItem: Awaited<ReturnType<typeof getShowByIdFn>>;
			mediaType: "tv";
			trackerState: MediaTrackerState;
	  };

export const Route = createFileRoute("/$type/$id/")({
	beforeLoad: async ({ location }) => {
		await requireAuthenticatedAccess(
			getSafeRedirectPath(`${location.pathname}${location.searchStr}`)
		);
	},
	loader: async ({ params }): Promise<MediaDetailsLoaderData> => {
		const mediaType = parseMediaType(params.type);
		const mediaId = parsePositiveId(params.id, "media");
		const trackerStatePromise = getMediaTrackerStateFn({
			data: {
				mediaId,
				mediaType,
			},
		});

		if (mediaType === "movies") {
			const [mediaItem, trackerState] = await Promise.all([
				getMovieByIdFn({
					data: {
						id: mediaId,
					},
				}),
				trackerStatePromise,
			]);

			return {
				mediaItem,
				mediaType,
				trackerState,
			};
		}

		const [mediaItem, trackerState] = await Promise.all([
			getShowByIdFn({
				data: {
					id: mediaId,
				},
			}),
			trackerStatePromise,
		]);

		return {
			mediaItem,
			mediaType,
			trackerState,
		};
	},
	component: MediaDetailsRoute,
	head: ({ loaderData }) => {
		if (!loaderData) {
			return {
				meta: [
					{
						title: "Not Found | Films",
					},
				],
			};
		}

		return {
			meta: [
				{
					title: `${getMediaTitle(loaderData.mediaItem)} | Films`,
				},
			],
		};
	},
	search: {
		middlewares: [stripSearchParams(DEFAULT_BROWSE_SEARCH)],
	},
	validateSearch: parseBrowseSearch,
});

function MediaDetailsRoute() {
	const loaderData = Route.useLoaderData();

	if (!loaderData) {
		return null;
	}

	return loaderData.mediaType === "movies" ? (
		<MovieDetailsPage
			movie={loaderData.mediaItem}
			trackerState={loaderData.trackerState}
		/>
	) : (
		<ShowDetailsPage
			show={loaderData.mediaItem}
			trackerState={loaderData.trackerState}
		/>
	);
}
