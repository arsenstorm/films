import { parseStoredGenreIds } from "@/lib/genre-ids";
import type { BrowseMediaItem, Movie, Show } from "@/lib/tmdb";

export interface TrackedBrowseMediaRow {
	backdropPath: string | null;
	genreIds: string;
	mediaId: number;
	mediaType: "movies" | "tv";
	overview: string;
	posterPath: string | null;
	releaseDate: string;
	title: string;
}

export function mapTrackedMovie(row: TrackedBrowseMediaRow): Movie {
	return {
		adult: false,
		backdrop_path: row.backdropPath,
		genre_ids: parseStoredGenreIds(row.genreIds),
		id: row.mediaId,
		original_language: "en",
		original_title: row.title,
		overview: row.overview,
		popularity: 0,
		poster_path: row.posterPath,
		release_date: row.releaseDate,
		title: row.title,
		video: false,
		vote_average: 0,
		vote_count: 0,
	};
}

export function mapTrackedShow(row: TrackedBrowseMediaRow): Show {
	return {
		adult: false,
		backdrop_path: row.backdropPath,
		first_air_date: row.releaseDate,
		genre_ids: parseStoredGenreIds(row.genreIds),
		id: row.mediaId,
		name: row.title,
		origin_country: [],
		original_language: "en",
		original_name: row.title,
		overview: row.overview,
		popularity: 0,
		poster_path: row.posterPath,
		vote_average: 0,
		vote_count: 0,
	};
}

export function mapTrackedBrowseMedia(
	row: TrackedBrowseMediaRow
): BrowseMediaItem {
	return row.mediaType === "movies"
		? {
				...mapTrackedMovie(row),
				mediaType: "movies",
			}
		: {
				...mapTrackedShow(row),
				mediaType: "tv",
			};
}
