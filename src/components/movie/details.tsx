import MediaDetailsPage from "@/components/media/details-page";

import type { MovieDetails } from "@/lib/tmdb";
import { getReleaseYear, getTmdbImageUrl } from "@/lib/tmdb";
import type { MediaTrackerState } from "@/server/tracker";

export default function MovieDetailsPageRoute({
	movie,
	trackerState,
}: {
	movie: MovieDetails;
	trackerState: MediaTrackerState;
}) {
	const backdropUrl = getTmdbImageUrl(
		movie.backdrop_path ?? movie.poster_path,
		"w1280"
	);
	const posterUrl = getTmdbImageUrl(
		movie.poster_path ?? movie.backdrop_path,
		"w500"
	);
	const releaseDate = movie.release_date
		? new Date(movie.release_date).toLocaleDateString()
		: "N/A";

	return (
		<MediaDetailsPage
			aboutLabel="About the film"
			backdropUrl={backdropUrl}
			backLabel="Back to movies"
			facts={[
				{
					label: "Release",
					value: releaseDate,
				},
				{
					label: "Language",
					value: movie.original_language.toUpperCase(),
				},
				{
					label: "Votes",
					value: String(movie.vote_count),
				},
			]}
			genres={movie.genres.slice(0, 3).map((genre) => genre.name)}
			heroPills={[
				getReleaseYear(movie.release_date),
				movie.runtime ? `${movie.runtime} min` : "Unknown",
				movie.status,
			]}
			homepage={movie.homepage}
			id={movie.id}
			overview={movie.overview || "No overview available for this movie."}
			posterLabel="At a glance"
			posterUrl={posterUrl}
			quickTake="This title is presented with a cinematic hero treatment that keeps the artwork front and center while the details sit inside a softer glass layer."
			releaseYear={getReleaseYear(movie.release_date)}
			statCards={[
				{
					label: "Release Date",
					value: releaseDate,
				},
				{
					label: "Runtime",
					value: movie.runtime ? `${movie.runtime} min` : "Unknown",
				},
				{
					label: "Audience Score",
					value: `${movie.vote_average.toFixed(1)}/10`,
				},
				{
					label: "Status",
					value: movie.status,
				},
				{
					label: "Popularity",
					value: String(Math.round(movie.popularity)),
				},
			]}
			tagline={movie.tagline}
			title={movie.title}
			titleTypeLabel="Movie"
			trackerMedia={{
				backdropPath: movie.backdrop_path,
				genreIds: movie.genres.map((genre) => genre.id),
				mediaId: movie.id,
				mediaType: "movies",
				overview: movie.overview || "",
				posterPath: movie.poster_path,
				releaseDate: movie.release_date || "",
				title: movie.title,
			}}
			trackerState={trackerState}
			type="movies"
			voteAverage={movie.vote_average.toFixed(1)}
		/>
	);
}
