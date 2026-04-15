import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, or } from "drizzle-orm";

import type { MediaType } from "@/lib/media";
import {
	type BrowseMediaItem,
	getGenreNames,
	type Movie,
	type Show,
} from "@/lib/tmdb";
import {
	mediaItem,
	recommendationFeedback,
	recommendationImpression,
	userMedia,
} from "@/schema";
import { requireAuthenticatedUserId } from "@/server/auth.server";
import { db } from "@/server/db";
import {
	type TrackableMediaInput,
	upsertMediaItem,
} from "@/server/media-items";
import {
	applyRecommendationRerankScores,
	buildExcludedRecommendationKeys,
	buildRecommendationBatch,
	buildRecommendationHistoryDiagnostics,
	buildRecommendationSeeds,
	buildRecommendationSignals,
	buildRecommendationTasteProfile,
	buildWatchlistCandidates,
	getDiscoveryMinimumVoteCount,
	getTopGenreIds,
	MAX_RELATED_SEEDS_PER_TYPE,
	type RecommendationBatchResult,
	type RecommendationCandidate,
	type RecommendationFeedbackRow,
	type RecommendationHistoryDiagnostics,
	type RecommendationImpressionRow,
	type RecommendationResult,
	type RecommendationSeed,
	rankRecommendationCandidates,
	type TrackedRecommendationRow,
} from "@/server/recommendations-engine";
import {
	getMovieRecommendations,
	getMovieSimilar,
	getMovies,
	getShowRecommendations,
	getShowSimilar,
	getShows,
} from "@/server/tmdb";

const DISCOVERY_PAGE = 1;
const RELATED_PAGE = 1;
const MAX_RECOMMENDATION_IMPRESSIONS = 250;
const RECOMMENDATION_RERANK_MODEL = "@cf/baai/bge-reranker-base";
const RECOMMENDATION_RERANK_POOL_SIZE = 12;

export type RecommendationFeedbackAction = "accepted" | "declined";

interface RecommendationRerankerResponse {
	response?: Array<{
		id: number;
		score: number;
	}>;
}

function getRecommendationKey(input: {
	mediaId: number;
	mediaType: MediaType;
}): string {
	return `${input.mediaType}:${input.mediaId}`;
}

function normalizeMovie(movie: Movie): BrowseMediaItem {
	return {
		...movie,
		mediaType: "movies",
	};
}

function normalizeShow(show: Show): BrowseMediaItem {
	return {
		...show,
		mediaType: "tv",
	};
}

function getRecommendationTitle(media: BrowseMediaItem): string {
	return media.mediaType === "movies" ? media.title : media.name;
}

function getTopGenreNames(
	profile: ReturnType<typeof buildRecommendationTasteProfile>,
	mediaType: MediaType
): string[] {
	const topGenreIds =
		getTopGenreIds(profile, mediaType)
			?.split(",")
			.map((genreId) => Number(genreId)) ?? [];

	return getGenreNames(topGenreIds);
}

function buildRecommendationRerankQuery(input: {
	profile: ReturnType<typeof buildRecommendationTasteProfile>;
	seeds: RecommendationSeed[];
}): string | null {
	const seedTitles = input.seeds.slice(0, 3).map((seed) => seed.title);
	const topMovieGenres = getTopGenreNames(input.profile, "movies");
	const topShowGenres = getTopGenreNames(input.profile, "tv");
	const queryParts = [
		seedTitles.length > 0
			? `Strong positive signals include: ${seedTitles.join(", ")}.`
			: null,
		topMovieGenres.length > 0
			? `Preferred movie genres: ${topMovieGenres.join(", ")}.`
			: null,
		topShowGenres.length > 0
			? `Preferred TV genres: ${topShowGenres.join(", ")}.`
			: null,
	];
	const query = queryParts.filter(Boolean).join(" ");

	if (query.length === 0) {
		return null;
	}

	return `${query} Prefer the option that best matches this taste profile, not just the most broadly popular title.`;
}

function buildRecommendationRerankContext(
	candidate: RecommendationCandidate
): string {
	const genres = getGenreNames(candidate.media.genre_ids);
	const contextParts = [
		`Title: ${getRecommendationTitle(candidate.media)}.`,
		`Type: ${candidate.media.mediaType === "movies" ? "Movie" : "TV series"}.`,
		genres.length > 0 ? `Genres: ${genres.join(", ")}.` : null,
		candidate.seedTitle ? `Related seed: ${candidate.seedTitle}.` : null,
		candidate.media.overview ? `Overview: ${candidate.media.overview}.` : null,
		`Source: ${candidate.source}.`,
	];

	return contextParts.filter(Boolean).join(" ");
}

function normalizeRerankScore(score: number): number {
	return 1 / (1 + Math.exp(-score));
}

async function rerankRecommendationCandidates(input: {
	candidates: RecommendationCandidate[];
	impressionRows: RecommendationImpressionRow[];
	profile: ReturnType<typeof buildRecommendationTasteProfile>;
	seeds: RecommendationSeed[];
}): Promise<RecommendationCandidate[]> {
	const rerankQuery = buildRecommendationRerankQuery({
		profile: input.profile,
		seeds: input.seeds,
	});

	if (!(env.AI && rerankQuery)) {
		return input.candidates;
	}

	const rerankPool = rankRecommendationCandidates({
		candidates: input.candidates,
		impressionRows: input.impressionRows,
		profile: input.profile,
	}).slice(0, RECOMMENDATION_RERANK_POOL_SIZE);

	if (rerankPool.length < 2) {
		return input.candidates;
	}

	try {
		const response = (await env.AI.run(RECOMMENDATION_RERANK_MODEL, {
			contexts: rerankPool.map((candidate) => ({
				text: buildRecommendationRerankContext(candidate),
			})),
			query: rerankQuery,
			top_k: rerankPool.length,
		})) as RecommendationRerankerResponse;
		const rerankScores = (response.response ?? []).flatMap((entry) => {
			const candidate = rerankPool[entry.id];

			if (!candidate) {
				return [];
			}

			return [
				{
					mediaId: candidate.media.id,
					mediaType: candidate.media.mediaType,
					score: normalizeRerankScore(entry.score),
				},
			];
		});

		if (rerankScores.length === 0) {
			return input.candidates;
		}

		return applyRecommendationRerankScores({
			candidates: input.candidates,
			rerankScores,
		});
	} catch {
		return input.candidates;
	}
}

function mapDiscoveryCandidate(
	media: BrowseMediaItem
): RecommendationCandidate {
	return {
		explicitInterestScore: 0,
		media,
		popularity: media.popularity,
		source: "discover",
		voteCount: media.vote_count,
	};
}

function mapRelatedCandidate(
	media: BrowseMediaItem,
	seed: RecommendationSeed
): RecommendationCandidate {
	return {
		explicitInterestScore: 0,
		media,
		popularity: media.popularity,
		seedTitle: seed.title,
		source: "related",
		voteCount: media.vote_count,
	};
}

function filterExcludedMedia(
	items: BrowseMediaItem[],
	excludedKeys: Set<string>
): BrowseMediaItem[] {
	return items.filter(
		(item) =>
			!excludedKeys.has(
				getRecommendationKey({
					mediaId: item.id,
					mediaType: item.mediaType,
				})
			)
	);
}

async function buildRelatedCandidates(
	seeds: RecommendationSeed[],
	excludedKeys: Set<string>
): Promise<RecommendationCandidate[]> {
	const movieSeeds = seeds
		.filter((seed) => seed.mediaType === "movies")
		.slice(0, MAX_RELATED_SEEDS_PER_TYPE);
	const showSeeds = seeds
		.filter((seed) => seed.mediaType === "tv")
		.slice(0, MAX_RELATED_SEEDS_PER_TYPE);
	const movieRequests = movieSeeds.flatMap((seed) => [
		getMovieRecommendations(seed.mediaId, RELATED_PAGE).then((response) => ({
			results: response.results.map(normalizeMovie),
			seed,
		})),
		getMovieSimilar(seed.mediaId, RELATED_PAGE).then((response) => ({
			results: response.results.map(normalizeMovie),
			seed,
		})),
	]);
	const showRequests = showSeeds.flatMap((seed) => [
		getShowRecommendations(seed.mediaId, RELATED_PAGE).then((response) => ({
			results: response.results.map(normalizeShow),
			seed,
		})),
		getShowSimilar(seed.mediaId, RELATED_PAGE).then((response) => ({
			results: response.results.map(normalizeShow),
			seed,
		})),
	]);
	const settledResponses = await Promise.allSettled([
		...movieRequests,
		...showRequests,
	]);

	return settledResponses.flatMap((entry) =>
		entry.status === "fulfilled"
			? filterExcludedMedia(entry.value.results, excludedKeys).map((media) =>
					mapRelatedCandidate(media, entry.value.seed)
				)
			: []
	);
}

async function buildDiscoveryCandidates(input: {
	excludedKeys: Set<string>;
	profile: ReturnType<typeof buildRecommendationTasteProfile>;
}): Promise<RecommendationCandidate[]> {
	const settledResponses = await Promise.allSettled([
		getMovies({
			page: DISCOVERY_PAGE,
			sort_by: "popularity.desc",
			type: "discover",
			vote_count_gte: getDiscoveryMinimumVoteCount(),
			with_genres: getTopGenreIds(input.profile, "movies"),
		}),
		getShows({
			page: DISCOVERY_PAGE,
			sort_by: "popularity.desc",
			type: "discover",
			vote_count_gte: getDiscoveryMinimumVoteCount(),
			with_genres: getTopGenreIds(input.profile, "tv"),
		}),
	]);
	const movieResponse =
		settledResponses[0]?.status === "fulfilled"
			? settledResponses[0].value
			: null;
	const showResponse =
		settledResponses[1]?.status === "fulfilled"
			? settledResponses[1].value
			: null;

	return [
		...(movieResponse
			? filterExcludedMedia(
					movieResponse.results.map(normalizeMovie),
					input.excludedKeys
				).map(mapDiscoveryCandidate)
			: []),
		...(showResponse
			? filterExcludedMedia(
					showResponse.results.map(normalizeShow),
					input.excludedKeys
				).map(mapDiscoveryCandidate)
			: []),
	];
}

function loadTrackedRecommendationRows(
	userId: string
): Promise<TrackedRecommendationRow[]> {
	return db
		.select({
			backdropPath: mediaItem.backdropPath,
			genreIds: mediaItem.genreIds,
			isFavorite: userMedia.isFavorite,
			isInWatchlist: userMedia.isInWatchlist,
			isWatched: userMedia.isWatched,
			mediaId: mediaItem.tmdbId,
			mediaType: mediaItem.mediaType,
			overview: mediaItem.overview,
			posterPath: mediaItem.posterPath,
			releaseDate: mediaItem.releaseDate,
			title: mediaItem.title,
			updatedAt: userMedia.updatedAt,
		})
		.from(userMedia)
		.innerJoin(mediaItem, eq(userMedia.mediaItemId, mediaItem.id))
		.where(
			and(
				eq(userMedia.userId, userId),
				or(
					eq(userMedia.isFavorite, true),
					eq(userMedia.isInWatchlist, true),
					eq(userMedia.isWatched, true)
				)
			)
		);
}

function loadRecommendationFeedbackRows(
	userId: string
): Promise<RecommendationFeedbackRow[]> {
	return db
		.select({
			genreIds: mediaItem.genreIds,
			isDisliked: recommendationFeedback.isDisliked,
			isLiked: recommendationFeedback.isLiked,
			mediaType: recommendationFeedback.mediaType,
			title: mediaItem.title,
			tmdbId: recommendationFeedback.tmdbId,
			updatedAt: recommendationFeedback.updatedAt,
		})
		.from(recommendationFeedback)
		.leftJoin(
			mediaItem,
			and(
				eq(recommendationFeedback.tmdbId, mediaItem.tmdbId),
				eq(recommendationFeedback.mediaType, mediaItem.mediaType)
			)
		)
		.where(eq(recommendationFeedback.userId, userId));
}

function loadRecommendationImpressionRows(
	userId: string
): Promise<RecommendationImpressionRow[]> {
	return db
		.select({
			createdAt: recommendationImpression.createdAt,
			mediaType: recommendationImpression.mediaType,
			source: recommendationImpression.source,
			tmdbId: recommendationImpression.tmdbId,
		})
		.from(recommendationImpression)
		.where(eq(recommendationImpression.userId, userId))
		.orderBy(desc(recommendationImpression.createdAt))
		.limit(MAX_RECOMMENDATION_IMPRESSIONS);
}

async function getRecommendationBatch(): Promise<RecommendationBatchResult | null> {
	const userId = await requireAuthenticatedUserId();
	const [trackedRows, feedbackRows, impressionRows] = await Promise.all([
		loadTrackedRecommendationRows(userId),
		loadRecommendationFeedbackRows(userId),
		loadRecommendationImpressionRows(userId),
	]);
	const signals = buildRecommendationSignals(trackedRows, feedbackRows);
	const isColdStart = signals.length === 0;
	const profile = buildRecommendationTasteProfile(signals);
	const excludedKeys = buildExcludedRecommendationKeys(
		feedbackRows,
		trackedRows
	);
	const watchlistCandidates = buildWatchlistCandidates(
		trackedRows,
		excludedKeys
	);
	const seeds = buildRecommendationSeeds({
		feedbackRows,
		trackedRows,
	});
	const [relatedCandidates, discoveryCandidates] = await Promise.all([
		buildRelatedCandidates(seeds, excludedKeys),
		buildDiscoveryCandidates({
			excludedKeys,
			profile,
		}),
	]);
	const candidates = [
		...watchlistCandidates,
		...relatedCandidates,
		...discoveryCandidates,
	];
	const rerankedCandidates = await rerankRecommendationCandidates({
		candidates,
		impressionRows,
		profile,
		seeds,
	});
	const batch = buildRecommendationBatch({
		candidates: rerankedCandidates,
		impressionRows,
		isColdStart,
		profile,
		seedCount: seeds.length,
		signalCount: signals.length,
	});

	return batch.recommendations.length > 0 ? batch : null;
}

async function getRecommendationDiagnostics(): Promise<RecommendationHistoryDiagnostics> {
	const userId = await requireAuthenticatedUserId();
	const [trackedRows, feedbackRows, impressionRows] = await Promise.all([
		loadTrackedRecommendationRows(userId),
		loadRecommendationFeedbackRows(userId),
		loadRecommendationImpressionRows(userId),
	]);
	const signals = buildRecommendationSignals(trackedRows, feedbackRows);
	const profile = buildRecommendationTasteProfile(signals);
	const seeds = buildRecommendationSeeds({
		feedbackRows,
		trackedRows,
	});

	return buildRecommendationHistoryDiagnostics({
		feedbackRows,
		impressionRows,
		profile,
		seedCount: seeds.length,
		signalCount: signals.length,
	});
}

async function recordRecommendationFeedback(input: {
	action: RecommendationFeedbackAction;
	media: TrackableMediaInput;
}): Promise<void> {
	const userId = await requireAuthenticatedUserId();
	const now = new Date();

	await upsertMediaItem(input.media);

	await db
		.insert(recommendationFeedback)
		.values({
			createdAt: now,
			isDisliked: input.action === "declined",
			isLiked: input.action === "accepted",
			mediaType: input.media.mediaType,
			tmdbId: input.media.mediaId,
			updatedAt: now,
			userId,
		})
		.onConflictDoUpdate({
			set: {
				isDisliked: input.action === "declined",
				isLiked: input.action === "accepted",
				updatedAt: now,
			},
			target: [
				recommendationFeedback.userId,
				recommendationFeedback.mediaType,
				recommendationFeedback.tmdbId,
			],
		});
}

async function recordRecommendationImpression(input: {
	mediaId: number;
	mediaType: MediaType;
	position: number;
	source: RecommendationResult["source"];
}): Promise<void> {
	const userId = await requireAuthenticatedUserId();

	await db.insert(recommendationImpression).values({
		createdAt: new Date(),
		mediaType: input.mediaType,
		position: Math.max(0, input.position),
		source: input.source,
		tmdbId: input.mediaId,
		userId,
	});
}

export const getRecommendationFn = createServerFn({ method: "GET" }).handler(
	async () => getRecommendationBatch()
);

export const recordRecommendationFeedbackFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			action: RecommendationFeedbackAction;
			media: TrackableMediaInput;
		}) => data
	)
	.handler(async ({ data }) => recordRecommendationFeedback(data));

export const recordRecommendationImpressionFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			mediaId: number;
			mediaType: MediaType;
			position: number;
			source: RecommendationResult["source"];
		}) => data
	)
	.handler(async ({ data }) => recordRecommendationImpression(data));

export const getRecommendationDiagnosticsFn = createServerFn({
	method: "GET",
}).handler(async () => getRecommendationDiagnostics());

export type {
	RecommendationBatchResult,
	RecommendationHistoryDiagnostics,
	RecommendationResult,
} from "@/server/recommendations-engine";
