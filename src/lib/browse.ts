import type { BrowseView } from "@/lib/media";
import type { MovieResponse, ShowResponse } from "@/lib/tmdb";
import {
	getMoviesFn,
	getShowsFn,
	searchMoviesFn,
	searchTvShowsFn,
} from "@/server/tmdb";
import { getTrackedMediaFn } from "@/server/tracker";

export function fetchMovies(
	searchQuery: string,
	page: number,
	view: BrowseView
): Promise<MovieResponse> {
	if (view !== "discover") {
		return getTrackedMediaFn({
			data: {
				page,
				query: searchQuery,
				type: "movies",
				view,
			},
		}) as Promise<MovieResponse>;
	}

	if (searchQuery) {
		return searchMoviesFn({
			data: {
				page,
				query: searchQuery,
			},
		});
	}

	return getMoviesFn({
		data: {
			page,
			type: "popular",
		},
	});
}

export function fetchShows(
	searchQuery: string,
	page: number,
	view: BrowseView
): Promise<ShowResponse> {
	if (view !== "discover") {
		return getTrackedMediaFn({
			data: {
				page,
				query: searchQuery,
				type: "tv",
				view,
			},
		}) as Promise<ShowResponse>;
	}

	if (searchQuery) {
		return searchTvShowsFn({
			data: {
				page,
				query: searchQuery,
			},
		});
	}

	return getShowsFn({
		data: {
			page,
			type: "popular",
		},
	});
}
