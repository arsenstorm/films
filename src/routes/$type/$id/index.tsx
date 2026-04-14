import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import MovieDetailsPage from "@/components/movie/details";
import ShowDetailsPage from "@/components/show/details";
import { getSafeRedirectPath } from "@/lib/auth";
import {
	DEFAULT_BROWSE_SEARCH,
	parseBrowseSearch,
	parseMediaType,
} from "@/lib/media";
import type { MovieDetails, ShowDetails } from "@/lib/tmdb";
import { requireAuthenticatedAccess } from "@/server/auth";
import { getMediaByIdFn } from "@/server/tmdb";
import {
	getMediaTrackerStateFn,
	type MediaTrackerState,
} from "@/server/tracker";

export const Route = createFileRoute("/$type/$id/")({
	beforeLoad: async ({ location }) => {
		await requireAuthenticatedAccess(
			getSafeRedirectPath(`${location.pathname}${location.searchStr}`)
		);
	},
	component: MediaDetailsRoute,
	head: ({ loaderData }) => {
		const data = loaderData as
			| {
					mediaItem: MovieDetails | ShowDetails;
					trackerState: MediaTrackerState;
			  }
			| undefined;

		if (!data) {
			return {
				meta: [
					{
						title: "Not Found | Films",
					},
				],
			};
		}

		const title =
			"title" in data.mediaItem ? data.mediaItem.title : data.mediaItem.name;

		return {
			meta: [
				{
					title: `${title} | Films`,
				},
			],
		};
	},
	loader: async ({ params }) => {
		const mediaType = parseMediaType(params.type);
		const mediaId = Number.parseInt(params.id, 10);
		const [mediaItem, trackerState] = await Promise.all([
			getMediaByIdFn({
				data: {
					id: mediaId,
					type: mediaType,
				},
			}),
			getMediaTrackerStateFn({
				data: {
					mediaId,
					mediaType,
				},
			}),
		]);

		return {
			mediaItem,
			trackerState,
		};
	},
	search: {
		middlewares: [stripSearchParams(DEFAULT_BROWSE_SEARCH)],
	},
	validateSearch: parseBrowseSearch,
});

function MediaDetailsRoute() {
	const { type } = Route.useParams();
	const loaderData = Route.useLoaderData();

	if (!loaderData) {
		return null;
	}

	const { mediaItem, trackerState } = loaderData;

	return type === "movies" ? (
		<MovieDetailsPage
			movie={mediaItem as unknown as MovieDetails}
			trackerState={trackerState}
		/>
	) : (
		<ShowDetailsPage
			show={mediaItem as unknown as ShowDetails}
			trackerState={trackerState}
		/>
	);
}
