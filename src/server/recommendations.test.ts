import { describe, expect, it } from "vitest";

import {
	buildRecommendationTasteProfile,
	createRecommendationReason,
	pickRecommendationCandidate,
	scoreRecommendationCandidate,
} from "@/server/recommendations";

function createMovieCandidate(
	overrides: Partial<{
		explicitInterestScore: number;
		genreIds: number[];
		id: number;
		popularity: number;
		source: "discover" | "watchlist";
		title: string;
		voteCount: number;
	}>
) {
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
		source: overrides.source ?? "discover",
		voteCount: overrides.voteCount ?? 1000,
	};
}

function createShowCandidate(
	overrides: Partial<{
		explicitInterestScore: number;
		genreIds: number[];
		id: number;
		popularity: number;
		source: "discover" | "watchlist";
		title: string;
		voteCount: number;
	}>
) {
	return {
		explicitInterestScore: overrides.explicitInterestScore ?? 0,
		media: {
			adult: false,
			backdrop_path: null,
			first_air_date: "2024-01-01",
			genre_ids: overrides.genreIds ?? [18],
			id: overrides.id ?? 2,
			mediaType: "tv" as const,
			name: overrides.title ?? "Candidate Show",
			origin_country: [],
			original_language: "en",
			original_name: overrides.title ?? "Candidate Show",
			overview: "",
			popularity: overrides.popularity ?? 40,
			poster_path: null,
			vote_average: 7.2,
			vote_count: overrides.voteCount ?? 1000,
		},
		popularity: overrides.popularity ?? 40,
		source: overrides.source ?? "discover",
		voteCount: overrides.voteCount ?? 1000,
	};
}

describe("buildRecommendationTasteProfile", () => {
	it("aggregates genre and media-type weights", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [28, 12],
				mediaType: "movies",
				weight: 6,
			},
			{
				genreIds: [28],
				mediaType: "movies",
				weight: 1.5,
			},
			{
				genreIds: [18],
				mediaType: "tv",
				weight: 4,
			},
		]);

		expect(profile.typeWeights.movies).toBe(7.5);
		expect(profile.typeWeights.tv).toBe(4);
		expect(profile.genreWeights.movies[28]).toBe(7.5);
		expect(profile.genreWeights.movies[12]).toBe(6);
		expect(profile.genreWeights.tv[18]).toBe(4);
	});
});

describe("scoreRecommendationCandidate", () => {
	it("rewards candidates that match the dominant genre and media type", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [28, 12],
				mediaType: "movies",
				weight: 6,
			},
			{
				genreIds: [18],
				mediaType: "tv",
				weight: 2,
			},
		]);
		const alignedMovie = createMovieCandidate({
			genreIds: [28, 12],
			id: 10,
			popularity: 55,
			voteCount: 1800,
		});
		const mismatchedShow = createShowCandidate({
			genreIds: [10_767],
			id: 11,
			popularity: 70,
			voteCount: 2400,
		});

		expect(scoreRecommendationCandidate(alignedMovie, profile)).toBeGreaterThan(
			scoreRecommendationCandidate(mismatchedShow, profile)
		);
	});
});

describe("pickRecommendationCandidate", () => {
	it("prefers a strong watchlist pick over a weaker discovery option", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [28, 12],
				mediaType: "movies",
				weight: 6,
			},
		]);
		const watchlistCandidate = createMovieCandidate({
			explicitInterestScore: 14,
			genreIds: [28, 12],
			id: 21,
			source: "watchlist",
		});
		const discoveryCandidate = createMovieCandidate({
			explicitInterestScore: 0,
			genreIds: [28],
			id: 22,
			popularity: 85,
			source: "discover",
			voteCount: 2500,
		});

		expect(
			pickRecommendationCandidate({
				candidates: [discoveryCandidate, watchlistCandidate],
				profile,
			})?.media.id
		).toBe(21);
	});

	it("returns null when there are no viable candidates", () => {
		expect(
			pickRecommendationCandidate({
				candidates: [],
				profile: buildRecommendationTasteProfile([]),
			})
		).toBeNull();
	});
});

describe("createRecommendationReason", () => {
	it("does not claim genre affinity when the candidate does not overlap the taste profile", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [28, 12],
				mediaType: "movies",
				weight: 6,
			},
		]);
		const candidate = createMovieCandidate({
			genreIds: [27, 9648],
			id: 31,
			source: "discover",
			title: "Spooky Pick",
		});

		expect(createRecommendationReason(candidate, profile)).toBe(
			"Recommended based on the kinds of movies you keep coming back to."
		);
	});

	it("only names genres that actually match the taste profile", () => {
		const profile = buildRecommendationTasteProfile([
			{
				genreIds: [27],
				mediaType: "movies",
				weight: 6,
			},
		]);
		const candidate = createMovieCandidate({
			genreIds: [27, 9648],
			id: 32,
			source: "discover",
			title: "Half Match",
		});

		expect(createRecommendationReason(candidate, profile)).toBe(
			"Recommended because it overlaps with the Horror titles you keep coming back to."
		);
	});
});
