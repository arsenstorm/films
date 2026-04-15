import type { BrowseMediaItem } from "@/lib/tmdb";
import type {
	RecommendationBatchResult,
	RecommendationResult,
} from "@/server/recommendations";

export function getRecommendationMediaKey(media: BrowseMediaItem): string {
	return `${media.mediaType}:${media.id}`;
}

export function mergeRecommendationQueues(
	currentQueue: RecommendationResult[],
	incomingBatch: RecommendationBatchResult | null
): RecommendationResult[] {
	if (!(incomingBatch && incomingBatch.recommendations.length > 0)) {
		return currentQueue;
	}

	if (currentQueue.length === 0) {
		return incomingBatch.recommendations;
	}

	const seenMediaKeys = new Set(
		currentQueue.map((recommendation) =>
			getRecommendationMediaKey(recommendation.media)
		)
	);
	const mergedQueue = [...currentQueue];

	for (const recommendation of incomingBatch.recommendations) {
		const mediaKey = getRecommendationMediaKey(recommendation.media);

		if (seenMediaKeys.has(mediaKey)) {
			continue;
		}

		seenMediaKeys.add(mediaKey);
		mergedQueue.push(recommendation);
	}

	return mergedQueue;
}

export function removeRecommendationFromQueue(
	queue: RecommendationResult[],
	media: BrowseMediaItem
): RecommendationResult[] {
	const mediaKey = getRecommendationMediaKey(media);

	return queue.filter(
		(recommendation) =>
			getRecommendationMediaKey(recommendation.media) !== mediaKey
	);
}

export function removeRecommendationFromBatch(
	batch: RecommendationBatchResult | null,
	media: BrowseMediaItem
): RecommendationBatchResult | null {
	if (!batch) {
		return null;
	}

	return {
		...batch,
		recommendations: removeRecommendationFromQueue(
			batch.recommendations,
			media
		),
	};
}
