import { describe, expect, it } from "vitest";

import {
	buildRecommendationBatch,
	buildRecommendationScoreBreakdown,
	buildRecommendationTasteProfile,
	createRecommendationReason,
	pickRecommendationBatch,
	type RecommendationCandidate,
	type RecommendationImpressionRow,
} from "@/server/recommendations-engine";

function createMovieCandidate(
	overrides: Partial<{
		explicitInterestScore: number;
		genreIds: number[];
		id: number;
		popularity: number;
		seedTitle: string | null;
		source: "discover" | "related" | "watchlist";
		title: string;
		voteCount: number;
	}>
): RecommendationCandidate {
	return {
		explicitInterestScore: overrides.explicitInterestScore ?? 0,
		media: {
			adult: false,
			backdrop_path: null,
			genre_ids: overrides.genreIds ?? [28],
			id: overrides.id ?? 1,
			mediaType: "movies" as const,
			original_language: "en",
			original_title: overrides.title ?? "Candidate",
			overview: "",
			popularity: overrides.popularity ?? 40,
			poster_path: null,
			release_date: "2024-01-01",
			title: overrides.title ?? "Candidate",
			video: false,
			vote_average: 7.2,
			vote_count: overrides.voteCount ?? 1000,
		},
		popularity: overrides.popularity ?? 40,
		seedTitle: overrides.seedTitle,
		source: overrides.source ?? "discover",
		voteCount: overrides.voteCount ?? 1000,
	};
}

function createImpressionRow(overrides: Partial<RecommendationImpressionRow>) {
	return {
		createdAt: overrides.createdAt ?? new Date(),
		mediaType: overrides.mediaType ?? "movies",
		source: overrides.source ?? "discover",
		tmdbId: overrides.tmdbId ?? 1,
	};
}

describe("buildRecommendationTasteProfile", () => {
	it("aggregates positive and negative genre and type weights", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [28, 12],
				kind: "positive",
				mediaType: "movies",
				weight: 6,
			},
			{
				genreIds: [28],
				kind: "positive",
				mediaType: "movies",
				weight: 1.5,
			},
			{
				genreIds: [28],
				kind: "negative",
				mediaType: "movies",
				weight: 3,
			},
			{
				genreIds: [18],
				kind: "positive",
				mediaType: "tv",
				weight: 4,
			},
		]);

		expect(profile.positiveTypeWeights.movies).toBe(7.5);
		expect(profile.negativeTypeWeights.movies).toBe(3);
		expect(profile.positiveGenreWeights.movies[28]).toBe(7.5);
		expect(profile.negativeGenreWeights.movies[28]).toBe(3);
		expect(profile.positiveTypeWeights.tv).toBe(4);
	});
});

describe("buildRecommendationScoreBreakdown", () => {
	it("penalizes repeatedly shown candidates", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [28, 12],
				kind: "positive",
				mediaType: "movies",
				weight: 6,
			},
		]);
		const candidate = createMovieCandidate({
			genreIds: [28, 12],
			id: 10,
			popularity: 55,
			voteCount: 1800,
		});
		const baseline = buildRecommendationScoreBreakdown({
			candidate,
			impressionRows: [],
			profile,
		});
		const repeatedExposure = buildRecommendationScoreBreakdown({
			candidate,
			impressionRows: [
				createImpressionRow({
					tmdbId: 10,
				}),
				createImpressionRow({
					tmdbId: 10,
				}),
			],
			profile,
		});

		expect(repeatedExposure.impressionPenalty).toBeGreaterThan(0);
		expect(repeatedExposure.totalScore).toBeLessThan(baseline.totalScore);
	});
});

describe("pickRecommendationBatch", () => {
	it("balances sources instead of filling the batch from one source", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [28, 12],
				kind: "positive",
				mediaType: "movies",
				weight: 6,
			},
		]);
		const candidates: RecommendationCandidate[] = [
			createMovieCandidate({
				explicitInterestScore: 6,
				id: 101,
				source: "watchlist",
			}),
			createMovieCandidate({
				explicitInterestScore: 5.5,
				id: 102,
				source: "watchlist",
			}),
			createMovieCandidate({
				id: 201,
				seedTitle: "Top Seed",
				source: "related",
			}),
			createMovieCandidate({
				id: 202,
				seedTitle: "Top Seed",
				source: "related",
			}),
			createMovieCandidate({
				id: 301,
				popularity: 70,
				source: "discover",
				voteCount: 2200,
			}),
			createMovieCandidate({
				id: 302,
				popularity: 68,
				source: "discover",
				voteCount: 2100,
			}),
		];
		const batch = pickRecommendationBatch({
			candidates,
			impressionRows: [],
			profile,
		});
		const sourceCounts = batch.reduce<Record<string, number>>(
			(counts, candidate) => {
				counts[candidate.source] = (counts[candidate.source] ?? 0) + 1;
				return counts;
			},
			{}
		);

		expect(batch).toHaveLength(6);
		expect(sourceCounts.watchlist).toBe(2);
		expect(sourceCounts.related).toBe(2);
		expect(sourceCounts.discover).toBe(2);
	});
});

describe("buildRecommendationBatch", () => {
	it("keeps the strongest watchlist candidate first while still returning a batch", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [28, 12],
				kind: "positive",
				mediaType: "movies",
				weight: 6,
			},
		]);
		const batch = buildRecommendationBatch({
			candidates: [
				createMovieCandidate({
					explicitInterestScore: 9,
					genreIds: [28, 12],
					id: 21,
					source: "watchlist",
				}),
				createMovieCandidate({
					genreIds: [28],
					id: 22,
					popularity: 85,
					source: "discover",
					voteCount: 2500,
				}),
				createMovieCandidate({
					genreIds: [28],
					id: 23,
					seedTitle: "Action Seed",
					source: "related",
					voteCount: 2200,
				}),
			],
			impressionRows: [],
			profile,
		});

		expect(batch.recommendations[0]?.media.id).toBe(21);
		expect(batch.recommendations).toHaveLength(3);
	});
});

describe("createRecommendationReason", () => {
	it("uses the related seed title when available", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [27],
				kind: "positive",
				mediaType: "movies",
				weight: 6,
			},
		]);
		const candidate = createMovieCandidate({
			genreIds: [27, 9648],
			id: 32,
			seedTitle: "Alien",
			source: "related",
			title: "Half Match",
		});

		expect(createRecommendationReason(candidate, profile)).toBe(
			"Recommended because you responded well to Alien and it matches the Horror titles you keep coming back to."
		);
	});
});
