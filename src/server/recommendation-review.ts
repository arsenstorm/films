import type { BrowseMediaItem } from "@/lib/tmdb";
import type { RecommendationReviewHistoryRow } from "@/server/recommendation-context";
import {
	bucketRecommendationHistoryRows,
	type RecommendationResult,
} from "@/server/recommendations-engine";
import { mapTrackedBrowseMedia } from "@/server/tracked-browse-media";

interface RecommendationReviewItem {
	media: BrowseMediaItem;
}

export interface RecommendationReviewResult {
	hidden: RecommendationReviewItem[];
	interested: RecommendationReviewItem[];
	newRecommendations: RecommendationResult[];
}

function mapRecommendationReviewItem(
	row: RecommendationReviewHistoryRow
): RecommendationReviewItem {
	return {
		media: mapTrackedBrowseMedia(row),
	};
}

export function buildRecommendationReviewResult(input: {
	newRecommendations: RecommendationResult[];
	reviewRows: RecommendationReviewHistoryRow[];
}): RecommendationReviewResult {
	const reviewBuckets = bucketRecommendationHistoryRows(input.reviewRows);

	return {
		hidden: reviewBuckets.hidden.map(mapRecommendationReviewItem),
		interested: reviewBuckets.interested.map(mapRecommendationReviewItem),
		newRecommendations: input.newRecommendations,
	};
}
