import type { MediaDetailsPageProps } from "@/components/media/details-page";
import {
	toTrackableMovieDetailsInput,
	toTrackableShowDetailsInput,
} from "@/lib/media-adapters";
import {
	getReleaseYear,
	getTmdbImageUrl,
	type MovieDetails,
	type ShowDetails,
} from "@/lib/tmdb";
import type { MediaTrackerState } from "@/server/tracker";

function getLocalizedDate(date: string | null | undefined): string {
	return date ? new Date(date).toLocaleDateString() : "N/A";
}

function getBackdropUrl(
	backdropPath: string | null,
	posterPath: string | null
): string | null {
	return getTmdbImageUrl(backdropPath ?? posterPath, "w1280");
}

function getPosterUrl(
	posterPath: string | null,
	backdropPath: string | null
): string | null {
	return getTmdbImageUrl(posterPath ?? backdropPath, "w500");
}

export function buildMovieDetailsPageProps(input: {
	movie: MovieDetails;
	trackerState: MediaTrackerState;
}): MediaDetailsPageProps {
	const releaseDate = getLocalizedDate(input.movie.release_date);

	return {
		aboutLabel: "About the film",
		backdropUrl: getBackdropUrl(
			input.movie.backdrop_path,
			input.movie.poster_path
		),
		backLabel: "Back to movies",
		facts: [
			{
				label: "Release",
				value: releaseDate,
			},
			{
				label: "Language",
				value: input.movie.original_language.toUpperCase(),
			},
			{
				label: "Votes",
				value: String(input.movie.vote_count),
			},
		],
		genres: input.movie.genres.slice(0, 3).map((genre) => genre.name),
		heroPills: [
			getReleaseYear(input.movie.release_date),
			input.movie.runtime ? `${input.movie.runtime} min` : "Unknown",
			input.movie.status,
		],
		homepage: input.movie.homepage,
		id: input.movie.id,
		overview: input.movie.overview || "No overview available for this movie.",
		posterLabel: "At a glance",
		posterUrl: getPosterUrl(input.movie.poster_path, input.movie.backdrop_path),
		quickTake:
			"This title is presented with a cinematic hero treatment that keeps the artwork front and center while the details sit inside a softer glass layer.",
		releaseYear: getReleaseYear(input.movie.release_date),
		statCards: [
			{
				label: "Release Date",
				value: releaseDate,
			},
			{
				label: "Runtime",
				value: input.movie.runtime ? `${input.movie.runtime} min` : "Unknown",
			},
			{
				label: "Audience Score",
				value: `${input.movie.vote_average.toFixed(1)}/10`,
			},
			{
				label: "Status",
				value: input.movie.status,
			},
			{
				label: "Popularity",
				value: String(Math.round(input.movie.popularity)),
			},
		],
		tagline: input.movie.tagline,
		title: input.movie.title,
		titleTypeLabel: "Movie",
		trackerMedia: toTrackableMovieDetailsInput(input.movie),
		trackerState: input.trackerState,
		type: "movies",
		voteAverage: input.movie.vote_average.toFixed(1),
	};
}

export function buildShowDetailsPageProps(input: {
	show: ShowDetails;
	trackerState: MediaTrackerState;
}): MediaDetailsPageProps {
	const releaseDate = getLocalizedDate(input.show.first_air_date);
	const runtime = input.show.episode_run_time[0]
		? `${input.show.episode_run_time[0]} min`
		: "Unknown";

	return {
		aboutLabel: "About the series",
		backdropUrl: getBackdropUrl(
			input.show.backdrop_path,
			input.show.poster_path
		),
		backLabel: "Back to TV shows",
		facts: [
			{
				label: "First Air",
				value: releaseDate,
			},
			{
				label: "Language",
				value: input.show.original_language.toUpperCase(),
			},
			{
				label: "Votes",
				value: String(input.show.vote_count),
			},
		],
		genres: input.show.genres.slice(0, 3).map((genre) => genre.name),
		heroPills: [
			getReleaseYear(input.show.first_air_date),
			runtime,
			input.show.status,
		],
		homepage: input.show.homepage,
		id: input.show.id,
		overview: input.show.overview || "No overview available for this show.",
		posterLabel: "At a glance",
		posterUrl: getPosterUrl(input.show.poster_path, input.show.backdrop_path),
		quickTake:
			"This title is presented with a cinematic hero treatment that keeps the artwork front and center while the details sit inside a softer glass layer.",
		releaseYear: getReleaseYear(input.show.first_air_date),
		statCards: [
			{
				label: "First Air Date",
				value: releaseDate,
			},
			{
				label: "Episode Runtime",
				value: runtime,
			},
			{
				label: "Audience Score",
				value: `${input.show.vote_average.toFixed(1)}/10`,
			},
			{
				label: "Seasons",
				value: String(input.show.number_of_seasons),
			},
			{
				label: "Episodes",
				value: String(input.show.number_of_episodes),
			},
			{
				label: "Status",
				value: input.show.status,
			},
			{
				label: "Popularity",
				value: String(Math.round(input.show.popularity)),
			},
		],
		tagline: input.show.tagline,
		title: input.show.name,
		titleTypeLabel: "Show",
		trackerMedia: toTrackableShowDetailsInput(input.show),
		trackerState: input.trackerState,
		type: "tv",
		voteAverage: input.show.vote_average.toFixed(1),
	};
}
