import { describe, expect, it } from "vitest";

import {
	mergeRecommendationQueues,
	removeRecommendationFromBatch,
} from "@/lib/recommendation-queue";
import type {
	RecommendationBatchResult,
	RecommendationResult,
} from "@/server/recommendations";

function createRecommendation(id: number, title: string): RecommendationResult {
	return {
		media: {
			adult: false,
			backdrop_path: null,
			genre_ids: [28],
			id,
			mediaType: "movies",
			original_language: "en",
			original_title: title,
			overview: "",
			popularity: 50,
			poster_path: null,
			release_date: "2024-01-01",
			title,
			video: false,
			vote_average: 7,
			vote_count: 1200,
		},
		reason: `${title} reason`,
		source: "discover",
	};
}

function createBatch(
	recommendations: RecommendationResult[]
): RecommendationBatchResult {
	return {
		metadata: {
			mode: "personalized",
			seedCount: 2,
			signalCount: 4,
			topMovieGenres: ["Action"],
			topShowGenres: [],
		},
		recommendations,
	};
}

describe("recommendation queue helpers", () => {
	it("does not re-add a swiped recommendation after removing it from the cached batch", () => {
		const firstRecommendation = createRecommendation(1, "First");
		const secondRecommendation = createRecommendation(2, "Second");
		const thirdRecommendation = createRecommendation(3, "Third");
		const cachedBatch = createBatch([
			firstRecommendation,
			secondRecommendation,
			thirdRecommendation,
		]);
		const remainingQueue = [secondRecommendation, thirdRecommendation];
		const updatedBatch = removeRecommendationFromBatch(
			cachedBatch,
			firstRecommendation.media
		);

		expect(mergeRecommendationQueues(remainingQueue, updatedBatch)).toEqual(
			remainingQueue
		);
	});

	it("appends only unseen recommendations when a refill batch arrives", () => {
		const secondRecommendation = createRecommendation(2, "Second");
		const thirdRecommendation = createRecommendation(3, "Third");
		const fourthRecommendation = createRecommendation(4, "Fourth");
		const refillBatch = createBatch([
			thirdRecommendation,
			fourthRecommendation,
		]);

		expect(
			mergeRecommendationQueues(
				[secondRecommendation, thirdRecommendation],
				refillBatch
			)
		).toEqual([
			secondRecommendation,
			thirdRecommendation,
			fourthRecommendation,
		]);
	});
});
