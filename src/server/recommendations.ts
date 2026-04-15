import { createServerFn } from "@tanstack/react-start";
import { and, eq, or } from "drizzle-orm";

import type { MediaType } from "@/lib/media";
import {
	type BrowseMediaItem,
	getGenreNames,
	type Movie,
	type Show,
} from "@/lib/tmdb";
import { mediaItem, recommendationFeedback, userMedia } from "@/schema";
import { requireAuthenticatedUserId } from "@/server/auth.server";
import { db } from "@/server/db";
import {
	parseStoredGenreIds,
	type TrackableMediaInput,
	upsertMediaItem,
} from "@/server/media-items";
import { getMovies, getShows } from "@/server/tmdb";

const FAVORITE_SIGNAL_WEIGHT = 6;
const WATCHED_SIGNAL_WEIGHT = 4;
const WATCHLIST_SIGNAL_WEIGHT = 2.5;
const ACCEPTED_SIGNAL_WEIGHT = 1.5;
const FAVORITE_CANDIDATE_BONUS = 18;
const WATCHLIST_CANDIDATE_BONUS = 10;
const WATCHLIST_SOURCE_BONUS = 12;
const RECENT_ACTIVITY_BONUS = 2;
const RECENT_ACTIVITY_WINDOW_DAYS = 45;
const TYPE_WEIGHT_MULTIPLIER = 1.25;
const GENRE_WEIGHT_MULTIPLIER = 1.15;
const POPULARITY_SCORE_CAP = 2;
const VOTE_COUNT_SCORE_CAP = 1.5;
const DISCOVERY_PAGE = 1;
const DISCOVERY_MINIMUM_VOTE_COUNT = 150;
const MAX_DISCOVERY_GENRES = 3;

type RecommendationSource = "discover" | "watchlist";

interface RecommendationSignal {
	genreIds: number[];
	mediaType: MediaType;
	weight: number;
}

interface RecommendationCandidate {
	explicitInterestScore: number;
	media: BrowseMediaItem;
	popularity: number;
	source: RecommendationSource;
	voteCount: number;
}

interface TrackedRecommendationRow {
	backdropPath: string | null;
	genreIds: string;
	isFavorite: boolean;
	isInWatchlist: boolean;
	isWatched: boolean;
	mediaId: number;
	mediaType: MediaType;
	overview: string;
	posterPath: string | null;
	releaseDate: string;
	title: string;
	updatedAt: Date;
}

interface RecommendationFeedbackRow {
	genreIds: string | null;
	isDisliked: boolean;
	isLiked: boolean;
	mediaType: MediaType;
	tmdbId: number;
}

export interface RecommendationTasteProfile {
	genreWeights: Record<MediaType, Record<number, number>>;
	typeWeights: Record<MediaType, number>;
}

export interface RecommendationResult {
	media: BrowseMediaItem;
	reason: string;
	source: RecommendationSource;
}

export type RecommendationFeedbackAction = "accepted" | "declined";

function getRecommendationKey(input: {
	mediaId: number;
	mediaType: MediaType;
}): string {
	return `${input.mediaType}:${input.mediaId}`;
}

function createEmptyTasteProfile(): RecommendationTasteProfile {
	return {
		genreWeights: {
			movies: {},
			tv: {},
		},
		typeWeights: {
			movies: 0,
			tv: 0,
		},
	};
}

function mapTrackedMovie(row: TrackedRecommendationRow): Movie {
	return {
		adult: false,
		backdrop_path: row.backdropPath,
		genre_ids: parseStoredGenreIds(row.genreIds),
		id: row.mediaId,
		original_language: "en",
		original_title: row.title,
		overview: row.overview,
		popularity: 0,
		poster_path: row.posterPath,
		release_date: row.releaseDate,
		title: row.title,
		video: false,
		vote_average: 0,
		vote_count: 0,
	};
}

function mapTrackedShow(row: TrackedRecommendationRow): Show {
	return {
		adult: false,
		backdrop_path: row.backdropPath,
		first_air_date: row.releaseDate,
		genre_ids: parseStoredGenreIds(row.genreIds),
		id: row.mediaId,
		name: row.title,
		origin_country: [],
		original_language: "en",
		original_name: row.title,
		overview: row.overview,
		popularity: 0,
		poster_path: row.posterPath,
		vote_average: 0,
		vote_count: 0,
	};
}

function mapTrackedBrowseMedia(row: TrackedRecommendationRow): BrowseMediaItem {
	if (row.mediaType === "movies") {
		return {
			...mapTrackedMovie(row),
			mediaType: "movies",
		};
	}

	return {
		...mapTrackedShow(row),
		mediaType: "tv",
	};
}

function getRecentActivityBonus(updatedAt: Date): number {
	const millisecondsSinceActivity = Date.now() - updatedAt.getTime();
	const recentActivityWindowMs =
		RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

	return millisecondsSinceActivity <= recentActivityWindowMs
		? RECENT_ACTIVITY_BONUS
		: 0;
}

function getExplicitInterestScore(row: TrackedRecommendationRow): number {
	let score = getRecentActivityBonus(row.updatedAt);

	if (row.isFavorite) {
		score += FAVORITE_CANDIDATE_BONUS;
	}

	if (row.isInWatchlist) {
		score += WATCHLIST_CANDIDATE_BONUS;
	}

	return score;
}

function getTopGenreIds(
	profile: RecommendationTasteProfile,
	mediaType: MediaType
): string | undefined {
	const entries = Object.entries(profile.genreWeights[mediaType]).sort(
		(leftEntry, rightEntry) => rightEntry[1] - leftEntry[1]
	);
	const topGenreIds = entries
		.slice(0, MAX_DISCOVERY_GENRES)
		.map(([genreId]) => genreId);

	return topGenreIds.length > 0 ? topGenreIds.join(",") : undefined;
}

function normalizeDiscoverMovie(movie: Movie): BrowseMediaItem {
	return {
		...movie,
		mediaType: "movies",
	};
}

function normalizeDiscoverShow(show: Show): BrowseMediaItem {
	return {
		...show,
		mediaType: "tv",
	};
}

function buildRecommendationSignals(
	trackedRows: TrackedRecommendationRow[],
	feedbackRows: RecommendationFeedbackRow[]
): RecommendationSignal[] {
	const signals: RecommendationSignal[] = [];

	for (const row of trackedRows) {
		const genreIds = parseStoredGenreIds(row.genreIds);
		const recentActivityWeight = getRecentActivityBonus(row.updatedAt) * 0.25;

		if (row.isFavorite) {
			signals.push({
				genreIds,
				mediaType: row.mediaType,
				weight: FAVORITE_SIGNAL_WEIGHT + recentActivityWeight,
			});
		}

		if (row.isWatched) {
			signals.push({
				genreIds,
				mediaType: row.mediaType,
				weight: WATCHED_SIGNAL_WEIGHT + recentActivityWeight,
			});
		}

		if (row.isInWatchlist) {
			signals.push({
				genreIds,
				mediaType: row.mediaType,
				weight: WATCHLIST_SIGNAL_WEIGHT + recentActivityWeight,
			});
		}
	}

	for (const row of feedbackRows) {
		if (!(row.isLiked && row.genreIds)) {
			continue;
		}

		signals.push({
			genreIds: parseStoredGenreIds(row.genreIds),
			mediaType: row.mediaType,
			weight: ACCEPTED_SIGNAL_WEIGHT,
		});
	}

	return signals;
}

export function buildRecommendationTasteProfile(
	signals: RecommendationSignal[]
): RecommendationTasteProfile {
	const profile = createEmptyTasteProfile();

	for (const signal of signals) {
		profile.typeWeights[signal.mediaType] += signal.weight;

		for (const genreId of signal.genreIds) {
			const currentWeight =
				profile.genreWeights[signal.mediaType][genreId] ?? 0;

			profile.genreWeights[signal.mediaType][genreId] =
				currentWeight + signal.weight;
		}
	}

	return profile;
}

export function scoreRecommendationCandidate(
	candidate: RecommendationCandidate,
	profile: RecommendationTasteProfile
): number {
	const typeWeight = profile.typeWeights[candidate.media.mediaType] ?? 0;
	const matchingGenreWeight = candidate.media.genre_ids.reduce(
		(totalWeight, genreId) =>
			totalWeight +
			(profile.genreWeights[candidate.media.mediaType][genreId] ?? 0),
		0
	);
	const sourceBonus =
		candidate.source === "watchlist" ? WATCHLIST_SOURCE_BONUS : 0;
	const popularityScore = Math.min(
		POPULARITY_SCORE_CAP,
		candidate.popularity / 100
	);
	const voteCountScore = Math.min(
		VOTE_COUNT_SCORE_CAP,
		candidate.voteCount / 2500
	);

	return (
		candidate.explicitInterestScore +
		sourceBonus +
		typeWeight * TYPE_WEIGHT_MULTIPLIER +
		matchingGenreWeight * GENRE_WEIGHT_MULTIPLIER +
		popularityScore +
		voteCountScore
	);
}

function getMatchedReasonGenres(
	candidate: RecommendationCandidate,
	profile: RecommendationTasteProfile
): string[] {
	const weightedGenreIds = candidate.media.genre_ids
		.map((genreId) => ({
			genreId,
			weight: profile.genreWeights[candidate.media.mediaType][genreId] ?? 0,
		}))
		.filter((entry) => entry.weight > 0)
		.sort((leftEntry, rightEntry) => rightEntry.weight - leftEntry.weight)
		.slice(0, 2)
		.map((entry) => entry.genreId);

	return getGenreNames(weightedGenreIds);
}

export function createRecommendationReason(
	candidate: RecommendationCandidate,
	profile: RecommendationTasteProfile
): string {
	const matchingGenres = getMatchedReasonGenres(candidate, profile);

	if (
		candidate.source === "watchlist" &&
		candidate.explicitInterestScore > 20
	) {
		return matchingGenres.length > 0
			? `Pulled from your watchlist because it overlaps with the ${matchingGenres.join(" and ")} titles you keep coming back to.`
			: "Pulled from your watchlist because you've already shown strong interest in it.";
	}

	if (candidate.source === "watchlist") {
		return matchingGenres.length > 0
			? `Picked from your watchlist because it fits the ${matchingGenres.join(" and ")} titles you tend to save.`
			: "Picked from your watchlist based on the titles you've already been saving.";
	}

	if (matchingGenres.length > 0) {
		return `Recommended because it overlaps with the ${matchingGenres.join(" and ")} titles you keep coming back to.`;
	}

	return candidate.media.mediaType === "movies"
		? "Recommended based on the kinds of movies you keep coming back to."
		: "Recommended based on the kinds of shows you keep coming back to.";
}

function buildExcludedRecommendationKeys(
	feedbackRows: RecommendationFeedbackRow[],
	trackedRows: TrackedRecommendationRow[]
): Set<string> {
	const excludedKeys = new Set<string>();

	for (const row of feedbackRows) {
		if (!(row.isDisliked || row.isLiked)) {
			continue;
		}

		excludedKeys.add(
			getRecommendationKey({
				mediaId: row.tmdbId,
				mediaType: row.mediaType,
			})
		);
	}

	for (const row of trackedRows) {
		if (!row.isWatched) {
			continue;
		}

		excludedKeys.add(
			getRecommendationKey({
				mediaId: row.mediaId,
				mediaType: row.mediaType,
			})
		);
	}

	return excludedKeys;
}

function buildWatchlistCandidates(
	trackedRows: TrackedRecommendationRow[],
	excludedKeys: Set<string>
): RecommendationCandidate[] {
	return trackedRows
		.filter((row) => row.isInWatchlist && !row.isWatched)
		.filter(
			(row) =>
				!excludedKeys.has(
					getRecommendationKey({
						mediaId: row.mediaId,
						mediaType: row.mediaType,
					})
				)
		)
		.map((row) => ({
			explicitInterestScore: getExplicitInterestScore(row),
			media: mapTrackedBrowseMedia(row),
			popularity: 0,
			source: "watchlist" as const,
			voteCount: 0,
		}));
}

async function buildDiscoveryCandidates(
	profile: RecommendationTasteProfile,
	excludedKeys: Set<string>
): Promise<RecommendationCandidate[]> {
	const [movieResponse, showResponse] = await Promise.all([
		getMovies({
			page: DISCOVERY_PAGE,
			type: "popular",
			vote_count_gte: DISCOVERY_MINIMUM_VOTE_COUNT,
			with_genres: getTopGenreIds(profile, "movies"),
		}),
		getShows({
			page: DISCOVERY_PAGE,
			type: "popular",
			vote_count_gte: DISCOVERY_MINIMUM_VOTE_COUNT,
			with_genres: getTopGenreIds(profile, "tv"),
		}),
	]);

	const movieCandidates = movieResponse.results
		.map(normalizeDiscoverMovie)
		.filter(
			(movie) =>
				!excludedKeys.has(
					getRecommendationKey({
						mediaId: movie.id,
						mediaType: movie.mediaType,
					})
				)
		)
		.map((media) => ({
			explicitInterestScore: 0,
			media,
			popularity: media.popularity,
			source: "discover" as const,
			voteCount: media.vote_count,
		}));
	const showCandidates = showResponse.results
		.map(normalizeDiscoverShow)
		.filter(
			(show) =>
				!excludedKeys.has(
					getRecommendationKey({
						mediaId: show.id,
						mediaType: show.mediaType,
					})
				)
		)
		.map((media) => ({
			explicitInterestScore: 0,
			media,
			popularity: media.popularity,
			source: "discover" as const,
			voteCount: media.vote_count,
		}));

	return [...movieCandidates, ...showCandidates];
}

export function pickRecommendationCandidate(input: {
	candidates: RecommendationCandidate[];
	profile: RecommendationTasteProfile;
}): RecommendationCandidate | null {
	const rankedCandidates = [...input.candidates].sort(
		(leftCandidate, rightCandidate) =>
			scoreRecommendationCandidate(rightCandidate, input.profile) -
			scoreRecommendationCandidate(leftCandidate, input.profile)
	);

	return rankedCandidates[0] ?? null;
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
			tmdbId: recommendationFeedback.tmdbId,
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

async function getRecommendation(): Promise<RecommendationResult | null> {
	const userId = await requireAuthenticatedUserId();
	const [trackedRows, feedbackRows] = await Promise.all([
		loadTrackedRecommendationRows(userId),
		loadRecommendationFeedbackRows(userId),
	]);
	const signals = buildRecommendationSignals(trackedRows, feedbackRows);

	if (signals.length === 0) {
		return null;
	}

	const profile = buildRecommendationTasteProfile(signals);
	const excludedKeys = buildExcludedRecommendationKeys(
		feedbackRows,
		trackedRows
	);
	const [watchlistCandidates, discoveryCandidates] = await Promise.all([
		Promise.resolve(buildWatchlistCandidates(trackedRows, excludedKeys)),
		buildDiscoveryCandidates(profile, excludedKeys),
	]);
	const candidate = pickRecommendationCandidate({
		candidates: [...watchlistCandidates, ...discoveryCandidates],
		profile,
	});

	if (!candidate) {
		return null;
	}

	return {
		media: candidate.media,
		reason: createRecommendationReason(candidate, profile),
		source: candidate.source,
	};
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

export const getRecommendationFn = createServerFn({ method: "GET" }).handler(
	async () => getRecommendation()
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
