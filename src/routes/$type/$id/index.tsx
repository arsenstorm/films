import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import MovieDetailsPage from "@/components/movie/details";
import ShowDetailsPage from "@/components/show/details";
import EpisodeDetailsPage from "@/components/show/episode-details";
import { getSafeRedirectPath } from "@/lib/auth";
import {
	DEFAULT_BROWSE_SEARCH,
	type MediaDetailsSearch,
	parseMediaDetailsSearch,
	parseMediaType,
	parsePositiveId,
} from "@/lib/media";
import { getMediaTitle } from "@/lib/media-adapters";
import type { EpisodeDetails, SeasonDetails } from "@/lib/tmdb";
import { requireAuthenticatedAccess } from "@/server/auth";
import {
	getMovieByIdFn,
	getShowByIdFn,
	getTvEpisodeFn,
	getTvSeasonFn,
} from "@/server/tmdb";
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
			episode: EpisodeDetails | null;
			mediaItem: Awaited<ReturnType<typeof getShowByIdFn>>;
			mediaType: "tv";
			season: SeasonDetails | null;
			trackerState: MediaTrackerState;
	  };

function pickInitialSeasonNumber(
	requested: number | undefined,
	availableSeasons: { season_number: number }[]
): number | null {
	const visibleSeasons = availableSeasons
		.filter((season) => season.season_number > 0)
		.map((season) => season.season_number);

	if (visibleSeasons.length === 0) {
		return null;
	}

	if (requested && visibleSeasons.includes(requested)) {
		return requested;
	}

	return visibleSeasons[0] ?? null;
}

export const Route = createFileRoute("/$type/$id/")({
	beforeLoad: async ({ location }) => {
		await requireAuthenticatedAccess(
			getSafeRedirectPath(`${location.pathname}${location.searchStr}`)
		);
	},
	loaderDeps: ({ search }) => ({
		episode: search.episode,
		season: search.season,
	}),
	loader: async ({ params, deps }): Promise<MediaDetailsLoaderData> => {
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

		const [show, trackerState] = await Promise.all([
			getShowByIdFn({
				data: {
					id: mediaId,
				},
			}),
			trackerStatePromise,
		]);

		const initialSeasonNumber = pickInitialSeasonNumber(
			deps.season,
			show.seasons
		);

		let season: SeasonDetails | null = null;
		let episode: EpisodeDetails | null = null;

		if (initialSeasonNumber !== null) {
			const seasonPromise = getTvSeasonFn({
				data: {
					seasonNumber: initialSeasonNumber,
					showId: mediaId,
				},
			});

			const episodePromise =
				deps.episode && deps.season
					? getTvEpisodeFn({
							data: {
								episodeNumber: deps.episode,
								seasonNumber: initialSeasonNumber,
								showId: mediaId,
							},
						}).catch(() => null)
					: Promise.resolve(null);

			[season, episode] = await Promise.all([
				seasonPromise.catch(() => null),
				episodePromise,
			]);
		}

		return {
			episode,
			mediaItem: show,
			mediaType,
			season,
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

		if (loaderData.mediaType === "tv" && loaderData.episode) {
			const episode = loaderData.episode;
			return {
				meta: [
					{
						title: `${getMediaTitle(loaderData.mediaItem)} S${episode.season_number}E${episode.episode_number} · ${episode.name} | Films`,
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
		middlewares: [stripSearchParams<MediaDetailsSearch>(DEFAULT_BROWSE_SEARCH)],
	},
	validateSearch: parseMediaDetailsSearch,
});

function MediaDetailsRoute() {
	const loaderData = Route.useLoaderData();

	if (!loaderData) {
		return null;
	}

	if (loaderData.mediaType === "movies") {
		return (
			<MovieDetailsPage
				movie={loaderData.mediaItem}
				trackerState={loaderData.trackerState}
			/>
		);
	}

	if (loaderData.episode && loaderData.season) {
		return (
			<EpisodeDetailsPage
				episode={loaderData.episode}
				season={loaderData.season}
				show={loaderData.mediaItem}
			/>
		);
	}

	return (
		<ShowDetailsPage
			season={loaderData.season}
			show={loaderData.mediaItem}
			trackerState={loaderData.trackerState}
		/>
	);
}
