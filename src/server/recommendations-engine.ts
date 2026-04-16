import { parseStoredGenreIds } from "@/lib/genre-ids";
import type { MediaType } from "@/lib/media";
import { type BrowseMediaItem, getGenreNames } from "@/lib/tmdb";
import {
	mapTrackedBrowseMedia,
	type TrackedBrowseMediaRow,
} from "@/server/tracked-browse-media";

const FAVORITE_SIGNAL_WEIGHT = 8;
const WATCHED_SIGNAL_WEIGHT = 5;
const WATCHLIST_SIGNAL_WEIGHT = 2.5;
const ACCEPTED_SIGNAL_WEIGHT = 3.5;
const DECLINED_SIGNAL_WEIGHT = 4.5;
const SIGNAL_DECAY_WINDOW_DAYS = 365;
const FAVORITE_CANDIDATE_BONUS = 4.5;
const WATCHLIST_CANDIDATE_BONUS = 2.5;
const POSITIVE_TYPE_WEIGHT_MULTIPLIER = 0.7;
const POSITIVE_GENRE_WEIGHT_MULTIPLIER = 1.05;
const NEGATIVE_TYPE_WEIGHT_MULTIPLIER = 0.55;
const NEGATIVE_GENRE_WEIGHT_MULTIPLIER = 1.1;
const SOURCE_PRIOR_SCORES: Record<RecommendationSource, number> = {
	discover: 1.4,
	related: 2.3,
	watchlist: 2.8,
};
const IMPRESSION_PENALTY_PER_VIEW = 1.05;
const IMPRESSION_RECENT_WINDOW_DAYS = 14;
const IMPRESSION_RECENT_PENALTY = 1.35;
const IMPRESSION_PENALTY_CAP = 4.5;
const POPULARITY_SCORE_CAP = 1.25;
const VOTE_COUNT_SCORE_CAP = 1;
const MAX_DIVERSITY_PENALTY = 3.2;
const SAME_TYPE_DIVERSITY_PENALTY = 0.45;
const SAME_SOURCE_DIVERSITY_PENALTY = 0.3;
const ONE_GENRE_OVERLAP_PENALTY = 0.65;
const MULTI_GENRE_OVERLAP_PENALTY = 1.4;
const STRONG_WATCHLIST_INTEREST_THRESHOLD = 6;
const DISCOVERY_MINIMUM_VOTE_COUNT = 150;
const RECOMMENDATION_RERANK_BOOST_MULTIPLIER = 3.5;
export const MAX_DISCOVERY_GENRES = 3;
export const MAX_RELATED_SEEDS_PER_TYPE = 1;
export const RECOMMENDATION_BATCH_SIZE = 6;

const SOURCE_BATCH_CAPS: Record<RecommendationSource, number> = {
	discover: 2,
	related: 2,
	watchlist: 2,
};

type RecommendationSignalKind = "negative" | "positive";

export type RecommendationSource = "discover" | "related" | "watchlist";

interface RecommendationSignal {
	genreIds: number[];
	kind: RecommendationSignalKind;
	mediaType: MediaType;
	weight: number;
}

export interface RecommendationCandidate {
	availabilityScore?: number;
	explicitInterestScore: number;
	media: BrowseMediaItem;
	popularity: number;
	rerankScore?: number;
	seedTitle?: string | null;
	source: RecommendationSource;
	voteCount: number;
}

export interface TrackedRecommendationRow extends TrackedBrowseMediaRow {
	isFavorite: boolean;
	isInWatchlist: boolean;
	isWatched: boolean;
	updatedAt: Date;
}

export interface RecommendationFeedbackRow {
	genreIds: string | null;
	isDisliked: boolean;
	isLiked: boolean;
	mediaType: MediaType;
	title: string | null;
	tmdbId: number;
	updatedAt: Date;
}

export interface RecommendationImpressionRow {
	createdAt: Date;
	mediaType: MediaType;
	source: RecommendationSource;
	tmdbId: number;
}

export interface RecommendationSeed {
	mediaId: number;
	mediaType: MediaType;
	title: string;
	weight: number;
}

export interface RecommendationTasteProfile {
	negativeGenreWeights: Record<MediaType, Record<number, number>>;
	negativeTypeWeights: Record<MediaType, number>;
	positiveGenreWeights: Record<MediaType, Record<number, number>>;
	positiveTypeWeights: Record<MediaType, number>;
}

export interface RecommendationScoreBreakdown {
	availabilityBoost: number;
	explicitInterestScore: number;
	impressionPenalty: number;
	negativeAffinityPenalty: number;
	popularityScore: number;
	positiveAffinityScore: number;
	rerankScore: number;
	sourceScore: number;
	totalScore: number;
	voteCountScore: number;
}

export interface RecommendationRerankScore {
	mediaId: number;
	mediaType: MediaType;
	score: number;
}

export interface RecommendationResult {
	media: BrowseMediaItem;
	reason: string;
	source: RecommendationSource;
}

export type RecommendationGenerationMode = "cold-start" | "personalized";

export interface RecommendationGenerationMetadata {
	mode: RecommendationGenerationMode;
	seedCount: number;
	signalCount: number;
	topMovieGenres: string[];
	topShowGenres: string[];
}

export interface RecommendationSourceDiagnostics {
	acceptanceRate: number;
	acceptedCount: number;
	declinedCount: number;
	impressionCount: number;
}

export interface RecommendationHistoryDiagnostics {
	acceptanceRate: number;
	acceptedCount: number;
	declinedCount: number;
	declineRate: number;
	impressionCount: number;
	mode: RecommendationGenerationMode;
	repeatExposureRate: number;
	seedCount: number;
	signalCount: number;
	sourceDiagnostics: Record<
		RecommendationSource,
		RecommendationSourceDiagnostics
	>;
	topMovieGenres: string[];
	topShowGenres: string[];
	uniqueImpressionCount: number;
}

export interface RecommendationBatchResult {
	metadata: RecommendationGenerationMetadata;
	recommendations: RecommendationResult[];
}

function getDaysSinceDate(value: Date): number {
	const millisecondsPerDay = 24 * 60 * 60 * 1000;
	return Math.max(0, (Date.now() - value.getTime()) / millisecondsPerDay);
}

function getRecencyMultiplier(updatedAt: Date): number {
	const daysSinceUpdate = getDaysSinceDate(updatedAt);
	return Math.max(0.25, 1 - daysSinceUpdate / SIGNAL_DECAY_WINDOW_DAYS);
}

function getRecommendationKey(input: {
	mediaId: number;
	mediaType: MediaType;
}): string {
	return `${input.mediaType}:${input.mediaId}`;
}

function getRecommendationMediaKey(media: BrowseMediaItem): string {
	return getRecommendationKey({
		mediaId: media.id,
		mediaType: media.mediaType,
	});
}

function createEmptyTasteProfile(): RecommendationTasteProfile {
	return {
		negativeGenreWeights: {
			movies: {},
			tv: {},
		},
		negativeTypeWeights: {
			movies: 0,
			tv: 0,
		},
		positiveGenreWeights: {
			movies: {},
			tv: {},
		},
		positiveTypeWeights: {
			movies: 0,
			tv: 0,
		},
	};
}

export function bucketRecommendationHistoryRows<
	TItem extends {
		isDisliked: boolean;
		isLiked: boolean;
		isTracked: boolean;
	},
>(
	items: TItem[]
): {
	hidden: TItem[];
	interested: TItem[];
} {
	const hidden: TItem[] = [];
	const interested: TItem[] = [];

	for (const item of items) {
		if (item.isDisliked) {
			hidden.push(item);
		}

		if (item.isLiked && !item.isTracked) {
			interested.push(item);
		}
	}

	return {
		hidden,
		interested,
	};
}

function getPositiveGenreWeight(
	profile: RecommendationTasteProfile,
	mediaType: MediaType,
	genreId: number
): number {
	return profile.positiveGenreWeights[mediaType][genreId] ?? 0;
}

function getNegativeGenreWeight(
	profile: RecommendationTasteProfile,
	mediaType: MediaType,
	genreId: number
): number {
	return profile.negativeGenreWeights[mediaType][genreId] ?? 0;
}

function getEffectiveGenreWeight(
	profile: RecommendationTasteProfile,
	mediaType: MediaType,
	genreId: number
): number {
	return (
		getPositiveGenreWeight(profile, mediaType, genreId) -
		getNegativeGenreWeight(profile, mediaType, genreId)
	);
}

function getTopGenreNamesForProfile(
	profile: RecommendationTasteProfile,
	mediaType: MediaType
): string[] {
	const topGenreIds = Object.keys(profile.positiveGenreWeights[mediaType])
		.map((genreId) => Number(genreId))
		.map((genreId) => ({
			genreId,
			weight: getEffectiveGenreWeight(profile, mediaType, genreId),
		}))
		.filter((entry) => entry.weight > 0)
		.sort((leftEntry, rightEntry) => rightEntry.weight - leftEntry.weight)
		.slice(0, 3)
		.map((entry) => entry.genreId);

	return getGenreNames(topGenreIds);
}

function getCandidatePositiveAffinity(
	candidate: RecommendationCandidate,
	profile: RecommendationTasteProfile
): number {
	const positiveTypeWeight =
		profile.positiveTypeWeights[candidate.media.mediaType] ?? 0;
	const positiveGenreWeight = candidate.media.genre_ids.reduce(
		(totalWeight, genreId) =>
			totalWeight +
			getPositiveGenreWeight(profile, candidate.media.mediaType, genreId),
		0
	);

	return (
		positiveTypeWeight * POSITIVE_TYPE_WEIGHT_MULTIPLIER +
		positiveGenreWeight * POSITIVE_GENRE_WEIGHT_MULTIPLIER
	);
}

function getCandidateNegativeAffinity(
	candidate: RecommendationCandidate,
	profile: RecommendationTasteProfile
): number {
	const negativeTypeWeight =
		profile.negativeTypeWeights[candidate.media.mediaType] ?? 0;
	const negativeGenreWeight = candidate.media.genre_ids.reduce(
		(totalWeight, genreId) =>
			totalWeight +
			getNegativeGenreWeight(profile, candidate.media.mediaType, genreId),
		0
	);

	return (
		negativeTypeWeight * NEGATIVE_TYPE_WEIGHT_MULTIPLIER +
		negativeGenreWeight * NEGATIVE_GENRE_WEIGHT_MULTIPLIER
	);
}

function getExplicitInterestScore(row: TrackedRecommendationRow): number {
	const recencyMultiplier = getRecencyMultiplier(row.updatedAt);
	let score = 0;

	if (row.isFavorite) {
		score += FAVORITE_CANDIDATE_BONUS * recencyMultiplier;
	}

	if (row.isInWatchlist) {
		score += WATCHLIST_CANDIDATE_BONUS * recencyMultiplier;
	}

	return score;
}

function buildImpressionStats(
	impressionRows: RecommendationImpressionRow[]
): Map<string, { count: number; lastShownAt: Date }> {
	const impressionStats = new Map<
		string,
		{ count: number; lastShownAt: Date }
	>();

	for (const row of impressionRows) {
		const key = getRecommendationKey({
			mediaId: row.tmdbId,
			mediaType: row.mediaType,
		});
		const currentStats = impressionStats.get(key);

		if (!currentStats) {
			impressionStats.set(key, {
				count: 1,
				lastShownAt: row.createdAt,
			});
			continue;
		}

		currentStats.count += 1;

		if (row.createdAt.getTime() > currentStats.lastShownAt.getTime()) {
			currentStats.lastShownAt = row.createdAt;
		}
	}

	return impressionStats;
}

function getImpressionPenalty(
	candidate: RecommendationCandidate,
	impressionStats: Map<string, { count: number; lastShownAt: Date }>
): number {
	const stats = impressionStats.get(getRecommendationMediaKey(candidate.media));

	if (!stats) {
		return 0;
	}

	const daysSinceLastShown = getDaysSinceDate(stats.lastShownAt);
	const recentPenalty =
		daysSinceLastShown <= IMPRESSION_RECENT_WINDOW_DAYS
			? IMPRESSION_RECENT_PENALTY
			: 0;

	return Math.min(
		IMPRESSION_PENALTY_CAP,
		stats.count * IMPRESSION_PENALTY_PER_VIEW + recentPenalty
	);
}

function getDiversityPenalty(
	candidate: RecommendationCandidate,
	selectedCandidates: RecommendationCandidate[]
): number {
	let penalty = 0;

	for (const selectedCandidate of selectedCandidates) {
		if (candidate.source === selectedCandidate.source) {
			penalty += SAME_SOURCE_DIVERSITY_PENALTY;
		}

		if (candidate.media.mediaType === selectedCandidate.media.mediaType) {
			penalty += SAME_TYPE_DIVERSITY_PENALTY;
		}

		const overlappingGenres = candidate.media.genre_ids.filter((genreId) =>
			selectedCandidate.media.genre_ids.includes(genreId)
		).length;

		if (overlappingGenres >= 2) {
			penalty += MULTI_GENRE_OVERLAP_PENALTY;
			continue;
		}

		if (overlappingGenres === 1) {
			penalty += ONE_GENRE_OVERLAP_PENALTY;
		}
	}

	return Math.min(MAX_DIVERSITY_PENALTY, penalty);
}

export function buildRecommendationSignals(
	trackedRows: TrackedRecommendationRow[],
	feedbackRows: RecommendationFeedbackRow[]
): RecommendationSignal[] {
	const signals: RecommendationSignal[] = [];

	for (const row of trackedRows) {
		const genreIds = parseStoredGenreIds(row.genreIds);
		const recencyMultiplier = getRecencyMultiplier(row.updatedAt);

		if (row.isFavorite) {
			signals.push({
				genreIds,
				kind: "positive",
				mediaType: row.mediaType,
				weight: FAVORITE_SIGNAL_WEIGHT * recencyMultiplier,
			});
		}

		if (row.isWatched) {
			signals.push({
				genreIds,
				kind: "positive",
				mediaType: row.mediaType,
				weight: WATCHED_SIGNAL_WEIGHT * recencyMultiplier,
			});
		}

		if (row.isInWatchlist) {
			signals.push({
				genreIds,
				kind: "positive",
				mediaType: row.mediaType,
				weight: WATCHLIST_SIGNAL_WEIGHT * recencyMultiplier,
			});
		}
	}

	for (const row of feedbackRows) {
		const recencyMultiplier = getRecencyMultiplier(row.updatedAt);
		const genreIds = row.genreIds ? parseStoredGenreIds(row.genreIds) : [];

		if (row.isLiked) {
			signals.push({
				genreIds,
				kind: "positive",
				mediaType: row.mediaType,
				weight: ACCEPTED_SIGNAL_WEIGHT * recencyMultiplier,
			});
		}

		if (row.isDisliked) {
			signals.push({
				genreIds,
				kind: "negative",
				mediaType: row.mediaType,
				weight: DECLINED_SIGNAL_WEIGHT * recencyMultiplier,
			});
		}
	}

	return signals;
}

export function buildRecommendationTasteProfile(
	signals: RecommendationSignal[]
): RecommendationTasteProfile {
	const profile = createEmptyTasteProfile();

	for (const signal of signals) {
		if (signal.kind === "positive") {
			profile.positiveTypeWeights[signal.mediaType] += signal.weight;

			for (const genreId of signal.genreIds) {
				const currentWeight =
					profile.positiveGenreWeights[signal.mediaType][genreId] ?? 0;

				profile.positiveGenreWeights[signal.mediaType][genreId] =
					currentWeight + signal.weight;
			}

			continue;
		}

		profile.negativeTypeWeights[signal.mediaType] += signal.weight;

		for (const genreId of signal.genreIds) {
			const currentWeight =
				profile.negativeGenreWeights[signal.mediaType][genreId] ?? 0;

			profile.negativeGenreWeights[signal.mediaType][genreId] =
				currentWeight + signal.weight;
		}
	}

	return profile;
}

export function buildRecommendationSeeds(input: {
	feedbackRows: RecommendationFeedbackRow[];
	trackedRows: TrackedRecommendationRow[];
}): RecommendationSeed[] {
	const seedWeights = new Map<string, RecommendationSeed>();

	for (const row of input.trackedRows) {
		const recencyMultiplier = getRecencyMultiplier(row.updatedAt);
		let weight = 0;

		if (row.isFavorite) {
			weight += FAVORITE_SIGNAL_WEIGHT * recencyMultiplier;
		}

		if (row.isWatched) {
			weight += WATCHED_SIGNAL_WEIGHT * recencyMultiplier;
		}

		if (row.isInWatchlist) {
			weight += WATCHLIST_SIGNAL_WEIGHT * recencyMultiplier;
		}

		if (weight <= 0) {
			continue;
		}

		const key = getRecommendationKey({
			mediaId: row.mediaId,
			mediaType: row.mediaType,
		});
		const currentSeed = seedWeights.get(key);

		if (currentSeed) {
			currentSeed.weight += weight;
			continue;
		}

		seedWeights.set(key, {
			mediaId: row.mediaId,
			mediaType: row.mediaType,
			title: row.title,
			weight,
		});
	}

	for (const row of input.feedbackRows) {
		if (!(row.isLiked && row.title)) {
			continue;
		}

		const key = getRecommendationKey({
			mediaId: row.tmdbId,
			mediaType: row.mediaType,
		});
		const weight = ACCEPTED_SIGNAL_WEIGHT * getRecencyMultiplier(row.updatedAt);
		const currentSeed = seedWeights.get(key);

		if (currentSeed) {
			currentSeed.weight += weight;
			continue;
		}

		seedWeights.set(key, {
			mediaId: row.tmdbId,
			mediaType: row.mediaType,
			title: row.title,
			weight,
		});
	}

	return [...seedWeights.values()].sort((leftSeed, rightSeed) => {
		if (rightSeed.weight !== leftSeed.weight) {
			return rightSeed.weight - leftSeed.weight;
		}

		return leftSeed.title.localeCompare(rightSeed.title);
	});
}

export function getTopGenreIds(
	profile: RecommendationTasteProfile,
	mediaType: MediaType
): string | undefined {
	const entries = Object.keys(profile.positiveGenreWeights[mediaType])
		.map((genreId) => Number(genreId))
		.map((genreId) => ({
			genreId,
			weight: getEffectiveGenreWeight(profile, mediaType, genreId),
		}))
		.filter((entry) => entry.weight > 0)
		.sort((leftEntry, rightEntry) => rightEntry.weight - leftEntry.weight)
		.slice(0, MAX_DISCOVERY_GENRES)
		.map((entry) => String(entry.genreId));

	return entries.length > 0 ? entries.join(",") : undefined;
}

export function getRecommendationSeedIds(
	seeds: RecommendationSeed[],
	mediaType: MediaType
): number[] {
	return seeds
		.filter((seed) => seed.mediaType === mediaType)
		.slice(0, MAX_RELATED_SEEDS_PER_TYPE)
		.map((seed) => seed.mediaId);
}

export function getDiscoveryMinimumVoteCount(): number {
	return DISCOVERY_MINIMUM_VOTE_COUNT;
}

export function buildExcludedRecommendationKeys(
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

export function buildWatchlistCandidates(
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

export function buildRecommendationScoreBreakdown(input: {
	candidate: RecommendationCandidate;
	impressionRows: RecommendationImpressionRow[];
	profile: RecommendationTasteProfile;
}): RecommendationScoreBreakdown {
	const impressionStats = buildImpressionStats(input.impressionRows);
	return buildRecommendationScoreBreakdownFromStats({
		candidate: input.candidate,
		impressionStats,
		profile: input.profile,
	});
}

function buildRecommendationScoreBreakdownFromStats(input: {
	candidate: RecommendationCandidate;
	impressionStats: Map<string, { count: number; lastShownAt: Date }>;
	profile: RecommendationTasteProfile;
}): RecommendationScoreBreakdown {
	const positiveAffinityScore = getCandidatePositiveAffinity(
		input.candidate,
		input.profile
	);
	const negativeAffinityPenalty = getCandidateNegativeAffinity(
		input.candidate,
		input.profile
	);
	const sourceScore = SOURCE_PRIOR_SCORES[input.candidate.source];
	const popularityScore = Math.min(
		POPULARITY_SCORE_CAP,
		input.candidate.popularity / 100
	);
	const voteCountScore = Math.min(
		VOTE_COUNT_SCORE_CAP,
		input.candidate.voteCount / 2500
	);
	const availabilityBoost = input.candidate.availabilityScore ?? 0;
	const rerankScore = input.candidate.rerankScore ?? 0;
	const impressionPenalty = getImpressionPenalty(
		input.candidate,
		input.impressionStats
	);
	const totalScore =
		input.candidate.explicitInterestScore +
		sourceScore +
		positiveAffinityScore +
		popularityScore +
		voteCountScore +
		availabilityBoost +
		rerankScore -
		negativeAffinityPenalty -
		impressionPenalty;

	return {
		availabilityBoost,
		explicitInterestScore: input.candidate.explicitInterestScore,
		impressionPenalty,
		negativeAffinityPenalty,
		popularityScore,
		positiveAffinityScore,
		rerankScore,
		sourceScore,
		totalScore,
		voteCountScore,
	};
}

export function scoreRecommendationCandidate(input: {
	candidate: RecommendationCandidate;
	impressionRows: RecommendationImpressionRow[];
	profile: RecommendationTasteProfile;
}): number {
	return buildRecommendationScoreBreakdown(input).totalScore;
}

export function applyRecommendationRerankScores(input: {
	candidates: RecommendationCandidate[];
	rerankScores: RecommendationRerankScore[];
}): RecommendationCandidate[] {
	const rerankScoresByKey = new Map(
		input.rerankScores.map((rerankScore) => [
			getRecommendationKey({
				mediaId: rerankScore.mediaId,
				mediaType: rerankScore.mediaType,
			}),
			rerankScore.score * RECOMMENDATION_RERANK_BOOST_MULTIPLIER,
		])
	);

	return input.candidates.map((candidate) => {
		const rerankScore = rerankScoresByKey.get(
			getRecommendationMediaKey(candidate.media)
		);

		if (rerankScore === undefined) {
			return candidate;
		}

		return {
			...candidate,
			rerankScore,
		};
	});
}

function dedupeRecommendationCandidates(input: {
	candidates: RecommendationCandidate[];
	impressionRows: RecommendationImpressionRow[];
	profile: RecommendationTasteProfile;
}): RecommendationCandidate[] {
	const impressionStats = buildImpressionStats(input.impressionRows);
	const candidatesByKey = new Map<
		string,
		{ candidate: RecommendationCandidate; score: number }
	>();

	for (const candidate of input.candidates) {
		const score = buildRecommendationScoreBreakdownFromStats({
			candidate,
			impressionStats,
			profile: input.profile,
		}).totalScore;
		const key = getRecommendationMediaKey(candidate.media);
		const currentCandidate = candidatesByKey.get(key);

		if (!(currentCandidate && currentCandidate.score >= score)) {
			candidatesByKey.set(key, {
				candidate,
				score,
			});
		}
	}

	return [...candidatesByKey.values()]
		.sort((leftEntry, rightEntry) => rightEntry.score - leftEntry.score)
		.map((entry) => entry.candidate);
}

export function rankRecommendationCandidates(input: {
	candidates: RecommendationCandidate[];
	impressionRows: RecommendationImpressionRow[];
	profile: RecommendationTasteProfile;
}): RecommendationCandidate[] {
	return dedupeRecommendationCandidates(input);
}

function getMatchedReasonGenres(
	candidate: RecommendationCandidate,
	profile: RecommendationTasteProfile
): string[] {
	const weightedGenreIds = candidate.media.genre_ids
		.map((genreId) => ({
			genreId,
			weight: getEffectiveGenreWeight(
				profile,
				candidate.media.mediaType,
				genreId
			),
		}))
		.filter((entry) => entry.weight > 0)
		.sort((leftEntry, rightEntry) => rightEntry.weight - leftEntry.weight)
		.slice(0, 2)
		.map((entry) => entry.genreId);

	return getGenreNames(weightedGenreIds);
}

export function createRecommendationReason(
	candidate: RecommendationCandidate,
	profile: RecommendationTasteProfile,
	options?: {
		isColdStart?: boolean;
	}
): string {
	if (options?.isColdStart) {
		return candidate.media.mediaType === "movies"
			? "Popular right now while we learn your movie taste."
			: "Popular right now while we learn your TV taste.";
	}

	const matchingGenres = getMatchedReasonGenres(candidate, profile);

	if (
		candidate.source === "watchlist" &&
		candidate.explicitInterestScore >= STRONG_WATCHLIST_INTEREST_THRESHOLD
	) {
		return matchingGenres.length > 0
			? `Pulled from your watchlist because it lines up with the ${matchingGenres.join(" and ")} titles you keep returning to.`
			: "Pulled from your watchlist because you've already shown strong interest in it.";
	}

	if (candidate.source === "watchlist") {
		return matchingGenres.length > 0
			? `Picked from your watchlist because it fits the ${matchingGenres.join(" and ")} titles you tend to save.`
			: "Picked from your watchlist based on the titles you've already been saving.";
	}

	if (candidate.source === "related" && candidate.seedTitle) {
		return matchingGenres.length > 0
			? `Recommended because you responded well to ${candidate.seedTitle} and it matches the ${matchingGenres.join(" and ")} titles you keep coming back to.`
			: `Recommended because you responded well to ${candidate.seedTitle}.`;
	}

	if (matchingGenres.length > 0) {
		return `Recommended because it overlaps with the ${matchingGenres.join(" and ")} titles you keep coming back to.`;
	}

	return candidate.media.mediaType === "movies"
		? "Recommended based on the kinds of movies you keep coming back to."
		: "Recommended based on the kinds of shows you keep coming back to.";
}

function createEmptySourceDiagnostics(): Record<
	RecommendationSource,
	RecommendationSourceDiagnostics
> {
	return {
		discover: {
			acceptanceRate: 0,
			acceptedCount: 0,
			declinedCount: 0,
			impressionCount: 0,
		},
		related: {
			acceptanceRate: 0,
			acceptedCount: 0,
			declinedCount: 0,
			impressionCount: 0,
		},
		watchlist: {
			acceptanceRate: 0,
			acceptedCount: 0,
			declinedCount: 0,
			impressionCount: 0,
		},
	};
}

function buildRecommendationImpressionDiagnostics(
	impressionRows: RecommendationImpressionRow[]
): {
	impressionsByMediaKey: Map<string, RecommendationImpressionRow[]>;
	sourceDiagnostics: Record<
		RecommendationSource,
		RecommendationSourceDiagnostics
	>;
	uniqueImpressionCount: number;
} {
	const sourceDiagnostics = createEmptySourceDiagnostics();
	const impressionsByMediaKey = new Map<
		string,
		RecommendationImpressionRow[]
	>();
	const uniqueImpressionKeys = new Set<string>();

	for (const impressionRow of impressionRows) {
		sourceDiagnostics[impressionRow.source].impressionCount += 1;
		const mediaKey = getRecommendationKey({
			mediaId: impressionRow.tmdbId,
			mediaType: impressionRow.mediaType,
		});
		const currentRows = impressionsByMediaKey.get(mediaKey) ?? [];

		currentRows.push(impressionRow);
		impressionsByMediaKey.set(mediaKey, currentRows);
		uniqueImpressionKeys.add(mediaKey);
	}

	for (const rows of impressionsByMediaKey.values()) {
		rows.sort(
			(leftRow, rightRow) =>
				rightRow.createdAt.getTime() - leftRow.createdAt.getTime()
		);
	}

	return {
		impressionsByMediaKey,
		sourceDiagnostics,
		uniqueImpressionCount: uniqueImpressionKeys.size,
	};
}

function applyFeedbackToSourceDiagnostics(input: {
	feedbackRows: RecommendationFeedbackRow[];
	impressionsByMediaKey: Map<string, RecommendationImpressionRow[]>;
	sourceDiagnostics: Record<
		RecommendationSource,
		RecommendationSourceDiagnostics
	>;
}): { acceptedCount: number; declinedCount: number } {
	let acceptedCount = 0;
	let declinedCount = 0;

	for (const feedbackRow of input.feedbackRows) {
		if (!(feedbackRow.isLiked || feedbackRow.isDisliked)) {
			continue;
		}

		const mediaKey = getRecommendationKey({
			mediaId: feedbackRow.tmdbId,
			mediaType: feedbackRow.mediaType,
		});
		const matchingImpression = input.impressionsByMediaKey
			.get(mediaKey)
			?.find(
				(impressionRow) =>
					impressionRow.createdAt.getTime() <= feedbackRow.updatedAt.getTime()
			);

		if (feedbackRow.isLiked) {
			acceptedCount += 1;

			if (matchingImpression) {
				input.sourceDiagnostics[matchingImpression.source].acceptedCount += 1;
			}
		}

		if (feedbackRow.isDisliked) {
			declinedCount += 1;

			if (matchingImpression) {
				input.sourceDiagnostics[matchingImpression.source].declinedCount += 1;
			}
		}
	}

	return {
		acceptedCount,
		declinedCount,
	};
}

function finalizeSourceAcceptanceRates(
	sourceDiagnostics: Record<
		RecommendationSource,
		RecommendationSourceDiagnostics
	>
): void {
	for (const diagnostics of Object.values(sourceDiagnostics)) {
		diagnostics.acceptanceRate =
			diagnostics.impressionCount > 0
				? diagnostics.acceptedCount / diagnostics.impressionCount
				: 0;
	}
}

export function buildRecommendationHistoryDiagnostics(input: {
	feedbackRows: RecommendationFeedbackRow[];
	impressionRows: RecommendationImpressionRow[];
	profile: RecommendationTasteProfile;
	seedCount: number;
	signalCount: number;
}): RecommendationHistoryDiagnostics {
	const { impressionsByMediaKey, sourceDiagnostics, uniqueImpressionCount } =
		buildRecommendationImpressionDiagnostics(input.impressionRows);
	const { acceptedCount, declinedCount } = applyFeedbackToSourceDiagnostics({
		feedbackRows: input.feedbackRows,
		impressionsByMediaKey,
		sourceDiagnostics,
	});

	finalizeSourceAcceptanceRates(sourceDiagnostics);

	const impressionCount = input.impressionRows.length;
	const repeatExposureCount = Math.max(
		0,
		impressionCount - uniqueImpressionCount
	);

	return {
		acceptanceRate: impressionCount > 0 ? acceptedCount / impressionCount : 0,
		acceptedCount,
		declineRate: impressionCount > 0 ? declinedCount / impressionCount : 0,
		declinedCount,
		impressionCount,
		mode: input.signalCount > 0 ? "personalized" : "cold-start",
		repeatExposureRate:
			impressionCount > 0 ? repeatExposureCount / impressionCount : 0,
		seedCount: input.seedCount,
		signalCount: input.signalCount,
		sourceDiagnostics,
		topMovieGenres: getTopGenreNamesForProfile(input.profile, "movies"),
		topShowGenres: getTopGenreNamesForProfile(input.profile, "tv"),
		uniqueImpressionCount,
	};
}

export function pickRecommendationBatch(input: {
	batchSize?: number;
	candidates: RecommendationCandidate[];
	impressionRows: RecommendationImpressionRow[];
	profile: RecommendationTasteProfile;
}): RecommendationCandidate[] {
	const batchSize = input.batchSize ?? RECOMMENDATION_BATCH_SIZE;
	const impressionStats = buildImpressionStats(input.impressionRows);
	const dedupedCandidates = dedupeRecommendationCandidates(input);
	const remainingCandidates = [...dedupedCandidates];
	const selectedCandidates: RecommendationCandidate[] = [];
	const sourceCounts: Record<RecommendationSource, number> = {
		discover: 0,
		related: 0,
		watchlist: 0,
	};

	while (
		selectedCandidates.length < batchSize &&
		remainingCandidates.length > 0
	) {
		const sourceEligibleCandidates = remainingCandidates.filter(
			(candidate) =>
				sourceCounts[candidate.source] < SOURCE_BATCH_CAPS[candidate.source]
		);
		const candidatePool =
			sourceEligibleCandidates.length > 0
				? sourceEligibleCandidates
				: remainingCandidates;
		let bestCandidate: RecommendationCandidate | null = null;
		let bestAdjustedScore = Number.NEGATIVE_INFINITY;

		for (const candidate of candidatePool) {
			const scoreBreakdown = buildRecommendationScoreBreakdownFromStats({
				candidate,
				impressionStats,
				profile: input.profile,
			});
			const adjustedScore =
				scoreBreakdown.totalScore -
				getDiversityPenalty(candidate, selectedCandidates);

			if (adjustedScore > bestAdjustedScore) {
				bestAdjustedScore = adjustedScore;
				bestCandidate = candidate;
			}
		}

		if (!bestCandidate) {
			break;
		}

		selectedCandidates.push(bestCandidate);
		sourceCounts[bestCandidate.source] += 1;
		const selectedKey = getRecommendationMediaKey(bestCandidate.media);
		const bestCandidateIndex = remainingCandidates.findIndex(
			(candidate) => getRecommendationMediaKey(candidate.media) === selectedKey
		);

		if (bestCandidateIndex >= 0) {
			remainingCandidates.splice(bestCandidateIndex, 1);
		}
	}

	return selectedCandidates;
}

export function buildRecommendationBatch(input: {
	batchSize?: number;
	candidates: RecommendationCandidate[];
	impressionRows: RecommendationImpressionRow[];
	isColdStart?: boolean;
	profile: RecommendationTasteProfile;
	seedCount?: number;
	signalCount?: number;
}): RecommendationBatchResult {
	return {
		metadata: {
			mode: input.isColdStart ? "cold-start" : "personalized",
			seedCount: input.seedCount ?? 0,
			signalCount: input.signalCount ?? 0,
			topMovieGenres: getTopGenreNamesForProfile(input.profile, "movies"),
			topShowGenres: getTopGenreNamesForProfile(input.profile, "tv"),
		},
		recommendations: pickRecommendationBatch(input).map((candidate) => ({
			media: candidate.media,
			reason: createRecommendationReason(candidate, input.profile, {
				isColdStart: input.isColdStart,
			}),
			source: candidate.source,
		})),
	};
}
