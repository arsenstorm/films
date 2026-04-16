import type { BrowseMediaType, BrowseView } from "@/lib/media";
import type {
	BrowseMediaResponse,
	MovieResponse,
	ShowResponse,
} from "@/lib/tmdb";
import {
	getAllMediaFn,
	getMoviesFn,
	getShowsFn,
	searchMoviesFn,
	searchTvShowsFn,
} from "@/server/tmdb";
import { getTrackedMediaFn } from "@/server/tracker";

export interface BrowsePageInput {
	page: number;
	query: string;
	type: BrowseMediaType;
	view: BrowseView;
}

export type BrowsePageResult =
	| {
			browsePage: BrowseMediaResponse;
			browseType: "all";
			view: BrowseView;
	  }
	| {
			browsePage: MovieResponse;
			browseType: "movies";
			view: BrowseView;
	  }
	| {
			browsePage: ShowResponse;
			browseType: "tv";
			view: BrowseView;
	  };

export function getBrowseMediaLabel(
	type: BrowseMediaType,
	view: BrowseView
): string {
	if (type === "all") {
		return view === "discover" ? "titles" : `${view} titles`;
	}

	if (type === "movies") {
		return view === "discover" ? "movies" : `${view} movies`;
	}

	return view === "discover" ? "shows" : `${view} shows`;
}

export async function loadBrowsePage(
	input: BrowsePageInput
): Promise<BrowsePageResult> {
	const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 1;
	const query = input.query.trim();

	if (input.type === "all") {
		if (input.view !== "discover") {
			return {
				browsePage: await getTrackedMediaFn({
					data: {
						page,
						query,
						type: "all",
						view: input.view,
					},
				}),
				browseType: "all",
				view: input.view,
			};
		}

		return {
			browsePage: await getAllMediaFn({
				data: {
					page,
					query,
				},
			}),
			browseType: "all",
			view: input.view,
		};
	}

	if (input.type === "movies") {
		if (input.view !== "discover") {
			return {
				browsePage: await getTrackedMediaFn({
					data: {
						page,
						query,
						type: "movies",
						view: input.view,
					},
				}),
				browseType: "movies",
				view: input.view,
			};
		}

		if (query) {
			return {
				browsePage: await searchMoviesFn({
					data: {
						page,
						query,
					},
				}),
				browseType: "movies",
				view: input.view,
			};
		}

		return {
			browsePage: await getMoviesFn({
				data: {
					page,
					type: "popular",
				},
			}),
			browseType: "movies",
			view: input.view,
		};
	}

	if (input.view !== "discover") {
		return {
			browsePage: await getTrackedMediaFn({
				data: {
					page,
					query,
					type: "tv",
					view: input.view,
				},
			}),
			browseType: "tv",
			view: input.view,
		};
	}

	if (query) {
		return {
			browsePage: await searchTvShowsFn({
				data: {
					page,
					query,
				},
			}),
			browseType: "tv",
			view: input.view,
		};
	}

	return {
		browsePage: await getShowsFn({
			data: {
				page,
				type: "popular",
			},
		}),
		browseType: "tv",
		view: input.view,
	};
}
