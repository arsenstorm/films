import { env } from "cloudflare:workers";
import type { MediaType } from "@/lib/media";
import {
	getMediaTitle,
	normalizeMovieBrowseMedia,
	normalizeShowBrowseMedia,
} from "@/lib/media-adapters";
import { getGenreNames } from "@/lib/tmdb";
import type { RecommendationContext } from "@/server/recommendation-context";
import {
	applyRecommendationRerankScores,
	buildExcludedRecommendationKeys,
	buildWatchlistCandidates,
	getDiscoveryMinimumVoteCount,
	getTopGenreIds,
	MAX_RELATED_SEEDS_PER_TYPE,
	type RecommendationCandidate,
	type RecommendationSeed,
	rankRecommendationCandidates,
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
const RECOMMENDATION_RERANK_MODEL = "@cf/baai/bge-reranker-base";
const RECOMMENDATION_RERANK_POOL_SIZE = 12;

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

function getTopGenreNames(
	context: RecommendationContext,
	mediaType: MediaType
): string[] {
	const topGenreIds =
		getTopGenreIds(context.profile, mediaType)
			?.split(",")
			.map((genreId) => Number(genreId)) ?? [];

	return getGenreNames(topGenreIds);
}

function buildRecommendationRerankQuery(
	context: RecommendationContext
): string | null {
	const seedTitles = context.seeds.slice(0, 3).map((seed) => seed.title);
	const topMovieGenres = getTopGenreNames(context, "movies");
	const topShowGenres = getTopGenreNames(context, "tv");
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
		`Title: ${getMediaTitle(candidate.media)}.`,
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

function mapDiscoveryCandidate(
	media: RecommendationCandidate["media"]
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
	media: RecommendationCandidate["media"],
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
	items: RecommendationCandidate["media"][],
	excludedKeys: Set<string>
): RecommendationCandidate["media"][] {
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
			results: response.results.map(normalizeMovieBrowseMedia),
			seed,
		})),
		getMovieSimilar(seed.mediaId, RELATED_PAGE).then((response) => ({
			results: response.results.map(normalizeMovieBrowseMedia),
			seed,
		})),
	]);
	const showRequests = showSeeds.flatMap((seed) => [
		getShowRecommendations(seed.mediaId, RELATED_PAGE).then((response) => ({
			results: response.results.map(normalizeShowBrowseMedia),
			seed,
		})),
		getShowSimilar(seed.mediaId, RELATED_PAGE).then((response) => ({
			results: response.results.map(normalizeShowBrowseMedia),
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

async function buildDiscoveryCandidates(
	context: RecommendationContext,
	excludedKeys: Set<string>
): Promise<RecommendationCandidate[]> {
	const settledResponses = await Promise.allSettled([
		getMovies({
			page: DISCOVERY_PAGE,
			sort_by: "popularity.desc",
			type: "discover",
			vote_count_gte: getDiscoveryMinimumVoteCount(),
			with_genres: getTopGenreIds(context.profile, "movies"),
		}),
		getShows({
			page: DISCOVERY_PAGE,
			sort_by: "popularity.desc",
			type: "discover",
			vote_count_gte: getDiscoveryMinimumVoteCount(),
			with_genres: getTopGenreIds(context.profile, "tv"),
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
					movieResponse.results.map(normalizeMovieBrowseMedia),
					excludedKeys
				).map(mapDiscoveryCandidate)
			: []),
		...(showResponse
			? filterExcludedMedia(
					showResponse.results.map(normalizeShowBrowseMedia),
					excludedKeys
				).map(mapDiscoveryCandidate)
			: []),
	];
}

export async function buildRecommendationCandidates(
	context: RecommendationContext
): Promise<RecommendationCandidate[]> {
	const excludedKeys = buildExcludedRecommendationKeys(
		context.feedbackRows,
		context.trackedRows
	);
	const watchlistCandidates = buildWatchlistCandidates(
		context.trackedRows,
		excludedKeys
	);
	const [relatedCandidates, discoveryCandidates] = await Promise.all([
		buildRelatedCandidates(context.seeds, excludedKeys),
		buildDiscoveryCandidates(context, excludedKeys),
	]);

	return [...watchlistCandidates, ...relatedCandidates, ...discoveryCandidates];
}

export async function rerankRecommendationCandidates(input: {
	candidates: RecommendationCandidate[];
	context: RecommendationContext;
}): Promise<RecommendationCandidate[]> {
	const rerankQuery = buildRecommendationRerankQuery(input.context);

	if (!(env.AI && rerankQuery)) {
		return input.candidates;
	}

	const rerankPool = rankRecommendationCandidates({
		candidates: input.candidates,
		impressionRows: input.context.impressionRows,
		profile: input.context.profile,
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
