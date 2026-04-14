import type { MediaType } from "@/lib/media";

export type MovieSortByOption =
	| "popularity.asc"
	| "popularity.desc"
	| "revenue.asc"
	| "revenue.desc"
	| "primary_release_date.asc"
	| "primary_release_date.desc"
	| "vote_average.asc"
	| "vote_average.desc"
	| "vote_count.asc"
	| "vote_count.desc";

export interface MovieParams {
	include_adult?: boolean;
	include_video?: boolean;
	language?: string;
	limit?: number;
	page?: number;
	primary_release_date_gte?: string;
	primary_release_date_lte?: string;
	primary_release_year?: number;
	sort_by?: MovieSortByOption;
	type?: "discover" | "now_playing" | "popular" | "top_rated" | "upcoming";
	vote_average_gte?: number;
	vote_average_lte?: number;
	vote_count_gte?: number;
	with_genres?: string;
	with_original_language?: string;
}

export interface ShowParams {
	include_adult?: boolean;
	language?: string;
	page?: number;
	sort_by?: MovieSortByOption;
	type?: "discover" | "popular" | "top_rated";
	vote_average_gte?: number;
	vote_average_lte?: number;
	vote_count_gte?: number;
	with_genres?: string;
	with_original_language?: string;
}

export interface Movie {
	adult: boolean;
	backdrop_path: string | null;
	genre_ids: number[];
	id: number;
	original_language: string;
	original_title: string;
	overview: string;
	popularity: number;
	poster_path: string | null;
	release_date: string;
	title: string;
	video: boolean;
	vote_average: number;
	vote_count: number;
}

export interface Show {
	adult: boolean;
	backdrop_path: string | null;
	first_air_date: string;
	genre_ids: number[];
	id: number;
	name: string;
	origin_country: string[];
	original_language: string;
	original_name: string;
	overview: string;
	popularity: number;
	poster_path: string | null;
	vote_average: number;
	vote_count: number;
}

export interface MovieResponse {
	page: number;
	results: Movie[];
	total_pages: number;
	total_results: number;
}

export interface ShowResponse {
	page: number;
	results: Show[];
	total_pages: number;
	total_results: number;
}

export interface Genre {
	id: number;
	name: string;
}

export interface MovieDetails {
	backdrop_path: string | null;
	genres: Genre[];
	homepage: string | null;
	id: number;
	original_language: string;
	overview: string;
	popularity: number;
	poster_path: string | null;
	release_date: string;
	runtime: number | null;
	status: string;
	tagline: string;
	title: string;
	vote_average: number;
	vote_count: number;
}

export interface ShowDetails {
	backdrop_path: string | null;
	episode_run_time: number[];
	first_air_date: string;
	genres: Genre[];
	homepage: string | null;
	id: number;
	name: string;
	number_of_episodes: number;
	number_of_seasons: number;
	original_language: string;
	overview: string;
	popularity: number;
	poster_path: string | null;
	status: string;
	tagline: string;
	vote_average: number;
	vote_count: number;
}

export interface WatchProvider {
	display_priority: number;
	logo_path: string | null;
	provider_id: number;
	provider_name: string;
}

export interface WatchProviderAvailability {
	buy?: WatchProvider[];
	flatrate?: WatchProvider[];
	link: string;
	rent?: WatchProvider[];
}

export interface WatchProviderResponse {
	id: number;
	results: Partial<Record<string, WatchProviderAvailability>>;
}

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const TMDB_MEDIA_BASE_URL = "https://www.themoviedb.org";

const genreMap: Record<number, string> = {
	12: "Adventure",
	14: "Fantasy",
	16: "Animation",
	18: "Drama",
	27: "Horror",
	28: "Action",
	35: "Comedy",
	36: "History",
	37: "Western",
	53: "Thriller",
	80: "Crime",
	99: "Documentary",
	878: "Science Fiction",
	9648: "Mystery",
	10402: "Music",
	10749: "Romance",
	10751: "Family",
	10752: "War",
	10759: "Action & Adventure",
	10762: "Kids",
	10763: "News",
	10764: "Reality",
	10765: "Sci-Fi & Fantasy",
	10766: "Soap",
	10767: "Talk",
	10768: "War & Politics",
	10770: "TV Movie",
};

export function getGenreNames(genreIds: number[]): string[] {
	return genreIds
		.map((genreId) => genreMap[genreId] ?? "Unknown")
		.filter(Boolean);
}

export function getTmdbImageUrl(
	path: string | null | undefined,
	width: "w92" | "w300" | "w342" | "w500" | "w1280"
): string | null {
	if (!path) {
		return null;
	}

	return `${TMDB_IMAGE_BASE_URL}/${width}${path}`;
}

export function getTmdbMediaPageUrl(type: MediaType, id: number): string {
	const mediaPath = type === "movies" ? "movie" : "tv";

	return `${TMDB_MEDIA_BASE_URL}/${mediaPath}/${id}`;
}

export function getReleaseYear(date: string | null | undefined): string {
	if (!date) {
		return "N/A";
	}

	const year = new Date(date).getFullYear();

	return Number.isNaN(year) ? "N/A" : String(year);
}
