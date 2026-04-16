import { QueryClient } from "@tanstack/react-query";

import type { MediaType } from "@/lib/media";

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
	});
}

export function getMediaTrackerStateQueryKey(input: {
	mediaId: number;
	mediaType: MediaType;
}): readonly ["media-tracker-state", MediaType, number] {
	return ["media-tracker-state", input.mediaType, input.mediaId] as const;
}

export function getRecommendationQueueQueryKey(): readonly [
	"recommendation-queue",
] {
	return ["recommendation-queue"] as const;
}
