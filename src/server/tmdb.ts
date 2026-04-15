import { createServerFn } from "@tanstack/react-start";

import type { MediaType } from "@/lib/media";
import type {
	BrowseMediaItem,
	BrowseMediaResponse,
	Movie,
	MovieDetails,
	MovieParams,
	MovieResponse,
	ShowDetails,
	ShowParams,
	ShowResponse,
	WatchProviderResponse,
} from "@/lib/tmdb";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const MARQUEE_PAGE_COUNT = 4;

interface TmdbMediaResultBase {
	media_type?: string;
}

type TmdbMixedMediaResult =
	| (Movie & TmdbMediaResultBase)
	| (Show & TmdbMediaResultBase)
	| (TmdbMediaResultBase & Record<string, unknown>);

interface TmdbMixedMediaResponse {
	page: number;
	results: TmdbMixedMediaResult[];
	total_pages: number;
	total_results: number;
}

function appendDefinedSearchParams(
	searchParams: URLSearchParams,
	values: Record<string, string | number | boolean | undefined>
): void {
	for (const [key, value] of Object.entries(values)) {
		if (value !== undefined) {
			searchParams.append(key, String(value));
		}
	}
}

async function fetchFromTmdb<T>(
	endpoint: string,
	searchParams: URLSearchParams
): Promise<T> {
	const apiKey = process.env.TMDB_API_KEY;

	if (!apiKey) {
		throw new Error("TMDB_API_KEY is not configured.");
	}

	const response = await fetch(
		`${TMDB_API_BASE_URL}/${endpoint}?${searchParams.toString()}`,
		{
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
		}
	);

	if (!response.ok) {
		throw new Error(
			`TMDB request failed: ${response.status} ${response.statusText}`
		);
	}

	return (await response.json()) as T;
}

function normalizeBrowseMediaResult(
	result: TmdbMixedMediaResult
): BrowseMediaItem | null {
	if (result.media_type === "tv") {
		return {
			...(result as Show),
			mediaType: "tv",
		};
	}

	if (result.media_type === "movie") {
		return {
			...(result as Movie),
			mediaType: "movies",
		};
	}

	return null;
}

export function getMovies(params: MovieParams = {}): Promise<MovieResponse> {
	const { type = "discover", ...restParams } = params;
	const searchParams = new URLSearchParams();

	appendDefinedSearchParams(
		searchParams,
		restParams as Record<string, string | number | boolean | undefined>
	);

	if (!searchParams.has("page")) {
		searchParams.set("page", "1");
	}

	const endpoint = type === "discover" ? "discover/movie" : `movie/${type}`;

	return fetchFromTmdb<MovieResponse>(endpoint, searchParams);
}

export function searchMovies(query: string, page = 1): Promise<MovieResponse> {
	const searchParams = new URLSearchParams();
	searchParams.set("query", query);
	searchParams.set("page", String(page));

	return fetchFromTmdb<MovieResponse>("search/movie", searchParams);
}

export function getShows(params: ShowParams = {}): Promise<ShowResponse> {
	const { type = "discover", ...restParams } = params;
	const searchParams = new URLSearchParams();

	appendDefinedSearchParams(
		searchParams,
		restParams as Record<string, string | number | boolean | undefined>
	);

	if (!searchParams.has("page")) {
		searchParams.set("page", "1");
	}

	const endpoint = type === "discover" ? "discover/tv" : `tv/${type}`;

	return fetchFromTmdb<ShowResponse>(endpoint, searchParams);
}

function getPagedTmdbCollection<T>(endpoint: string, page = 1): Promise<T> {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(page));

	return fetchFromTmdb<T>(endpoint, searchParams);
}

export function getMovieRecommendations(
	id: number,
	page = 1
): Promise<MovieResponse> {
	return getPagedTmdbCollection<MovieResponse>(
		`movie/${id}/recommendations`,
		page
	);
}

export function getMovieSimilar(id: number, page = 1): Promise<MovieResponse> {
	return getPagedTmdbCollection<MovieResponse>(`movie/${id}/similar`, page);
}

export function getShowRecommendations(
	id: number,
	page = 1
): Promise<ShowResponse> {
	return getPagedTmdbCollection<ShowResponse>(`tv/${id}/recommendations`, page);
}

export function getShowSimilar(id: number, page = 1): Promise<ShowResponse> {
	return getPagedTmdbCollection<ShowResponse>(`tv/${id}/similar`, page);
}

export function searchTvShows(query: string, page = 1): Promise<ShowResponse> {
	const searchParams = new URLSearchParams();
	searchParams.set("query", query);
	searchParams.set("page", String(page));

	return fetchFromTmdb<ShowResponse>("search/tv", searchParams);
}

export async function getAllMedia(
	query: string,
	page = 1
): Promise<BrowseMediaResponse> {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(page));

	if (query) {
		searchParams.set("query", query);
	}

	const endpoint = query ? "search/multi" : "trending/all/week";
	const response = await fetchFromTmdb<TmdbMixedMediaResponse>(
		endpoint,
		searchParams
	);

	return {
		page: response.page,
		results: response.results
			.map(normalizeBrowseMediaResult)
			.filter((result): result is BrowseMediaItem => result !== null),
		total_pages: response.total_pages,
		total_results: response.total_results,
	};
}

export function getMovieById(id: number): Promise<MovieDetails> {
	return fetchFromTmdb<MovieDetails>(`movie/${id}`, new URLSearchParams());
}

export function getShowById(id: number): Promise<ShowDetails> {
	return fetchFromTmdb<ShowDetails>(`tv/${id}`, new URLSearchParams());
}

export function getMediaById(
	type: MediaType,
	id: number
): Promise<MovieDetails | ShowDetails> {
	return type === "movies" ? getMovieById(id) : getShowById(id);
}

export function getMovieWatchProviders(
	id: number
): Promise<WatchProviderResponse> {
	return fetchFromTmdb<WatchProviderResponse>(
		`movie/${id}/watch/providers`,
		new URLSearchParams()
	);
}

export function getShowWatchProviders(
	id: number
): Promise<WatchProviderResponse> {
	return fetchFromTmdb<WatchProviderResponse>(
		`tv/${id}/watch/providers`,
		new URLSearchParams()
	);
}

export function getMediaWatchProviders(
	type: MediaType,
	id: number
): Promise<WatchProviderResponse> {
	return type === "movies"
		? getMovieWatchProviders(id)
		: getShowWatchProviders(id);
}

export async function getMarqueeMovies(): Promise<Movie[]> {
	const responses = await Promise.all(
		Array.from({ length: MARQUEE_PAGE_COUNT }, (_, index) =>
			getMovies({ page: index + 1, type: "popular" })
		)
	);

	const moviesById = new Map<number, Movie>();

	for (const response of responses) {
		for (const movie of response.results) {
			moviesById.set(movie.id, movie);
		}
	}

	return [...moviesById.values()];
}

export const getMoviesFn = createServerFn({ method: "GET" })
	.inputValidator((data: MovieParams | undefined) => data ?? {})
	.handler(async ({ data }) => getMovies(data));

export const searchMoviesFn = createServerFn({ method: "GET" })
	.inputValidator((data: { page?: number; query: string }) => data)
	.handler(async ({ data }) => searchMovies(data.query, data.page));

export const getShowsFn = createServerFn({ method: "GET" })
	.inputValidator((data: ShowParams | undefined) => data ?? {})
	.handler(async ({ data }) => getShows(data));

export const searchTvShowsFn = createServerFn({ method: "GET" })
	.inputValidator((data: { page?: number; query: string }) => data)
	.handler(async ({ data }) => searchTvShows(data.query, data.page));

export const getAllMediaFn = createServerFn({ method: "GET" })
	.inputValidator(
		(data: { page?: number; query?: string } | undefined) => data ?? {}
	)
	.handler(async ({ data }) => getAllMedia(data.query ?? "", data.page));

export const getMovieByIdFn = createServerFn({ method: "GET" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => getMovieById(data.id));

export const getShowByIdFn = createServerFn({ method: "GET" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => getShowById(data.id));

export const getMediaByIdFn = createServerFn({ method: "GET" })
	.inputValidator((data: { id: number; type: MediaType }) => data)
	.handler(async ({ data }) => getMediaById(data.type, data.id));

export const getMediaWatchProvidersFn = createServerFn({ method: "GET" })
	.inputValidator((data: { id: number; type: MediaType }) => data)
	.handler(async ({ data }) => getMediaWatchProviders(data.type, data.id));

export const getMarqueeMoviesFn = createServerFn({ method: "GET" }).handler(
	async () => getMarqueeMovies()
);
