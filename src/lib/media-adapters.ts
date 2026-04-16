import type {
	BrowseMediaItem,
	Movie,
	MovieDetails,
	Show,
	ShowDetails,
} from "@/lib/tmdb";
import type { TrackableMediaInput } from "@/server/media-items";

type MediaTitleSource =
	| BrowseMediaItem
	| Movie
	| MovieDetails
	| Show
	| ShowDetails;

export function getMediaTitle(media: MediaTitleSource): string {
	return "title" in media ? media.title : media.name;
}

export function getMediaReleaseDate(media: MediaTitleSource): string {
	return "release_date" in media ? media.release_date : media.first_air_date;
}

export function normalizeMovieBrowseMedia(movie: Movie): BrowseMediaItem {
	return {
		...movie,
		mediaType: "movies",
	};
}

export function normalizeShowBrowseMedia(show: Show): BrowseMediaItem {
	return {
		...show,
		mediaType: "tv",
	};
}

export function toTrackableBrowseMediaInput(
	media: BrowseMediaItem
): TrackableMediaInput {
	return media.mediaType === "movies"
		? {
				backdropPath: media.backdrop_path,
				genreIds: media.genre_ids,
				mediaId: media.id,
				mediaType: "movies",
				overview: media.overview ?? "",
				posterPath: media.poster_path,
				releaseDate: media.release_date ?? "",
				title: media.title,
			}
		: {
				backdropPath: media.backdrop_path,
				genreIds: media.genre_ids,
				mediaId: media.id,
				mediaType: "tv",
				overview: media.overview ?? "",
				posterPath: media.poster_path,
				releaseDate: media.first_air_date ?? "",
				title: media.name,
			};
}

export function toTrackableMovieDetailsInput(
	movie: MovieDetails
): TrackableMediaInput {
	return {
		backdropPath: movie.backdrop_path,
		genreIds: movie.genres.map((genre) => genre.id),
		mediaId: movie.id,
		mediaType: "movies",
		overview: movie.overview || "",
		posterPath: movie.poster_path,
		releaseDate: movie.release_date || "",
		title: movie.title,
	};
}

export function toTrackableShowDetailsInput(
	show: ShowDetails
): TrackableMediaInput {
	return {
		backdropPath: show.backdrop_path,
		genreIds: show.genres.map((genre) => genre.id),
		mediaId: show.id,
		mediaType: "tv",
		overview: show.overview || "",
		posterPath: show.poster_path,
		releaseDate: show.first_air_date || "",
		title: show.name,
	};
}
