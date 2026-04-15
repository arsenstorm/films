import { QueryClient } from "@tanstack/react-query";

import type { BrowseMediaType, BrowseView, MediaType } from "@/lib/media";

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
	});
}

export function getBrowseQueryKey(input: {
	page: number;
	searchQuery: string;
	type: BrowseMediaType;
	view: BrowseView;
}): readonly ["browse-media", BrowseMediaType, BrowseView, string, number] {
	return [
		"browse-media",
		input.type,
		input.view,
		input.searchQuery.trim(),
		input.page,
	] as const;
}

export function getMediaTrackerStateQueryKey(input: {
	mediaId: number;
	mediaType: MediaType;
}): readonly ["media-tracker-state", MediaType, number] {
	return ["media-tracker-state", input.mediaType, input.mediaId] as const;
}
