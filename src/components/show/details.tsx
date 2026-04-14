import MediaDetailsPage from "@/components/media/details-page";

import type { ShowDetails } from "@/lib/tmdb";
import { getReleaseYear, getTmdbImageUrl } from "@/lib/tmdb";
import type { MediaTrackerState } from "@/server/tracker";

export default function ShowDetailsPageRoute({
	show,
	trackerState,
}: {
	show: ShowDetails;
	trackerState: MediaTrackerState;
}) {
	const backdropUrl = getTmdbImageUrl(
		show.backdrop_path ?? show.poster_path,
		"w1280"
	);
	const posterUrl = getTmdbImageUrl(
		show.poster_path ?? show.backdrop_path,
		"w500"
	);
	const releaseDate = show.first_air_date
		? new Date(show.first_air_date).toLocaleDateString()
		: "N/A";
	const runtime = show.episode_run_time[0]
		? `${show.episode_run_time[0]} min`
		: "Unknown";

	return (
		<MediaDetailsPage
			aboutLabel="About the series"
			backdropUrl={backdropUrl}
			backLabel="Back to TV shows"
			facts={[
				{
					label: "First Air",
					value: releaseDate,
				},
				{
					label: "Language",
					value: show.original_language.toUpperCase(),
				},
				{
					label: "Votes",
					value: String(show.vote_count),
				},
			]}
			genres={show.genres.slice(0, 3).map((genre) => genre.name)}
			heroPills={[getReleaseYear(show.first_air_date), runtime, show.status]}
			homepage={show.homepage}
			id={show.id}
			overview={show.overview || "No overview available for this show."}
			posterLabel="At a glance"
			posterUrl={posterUrl}
			quickTake="This title is presented with a cinematic hero treatment that keeps the artwork front and center while the details sit inside a softer glass layer."
			releaseYear={getReleaseYear(show.first_air_date)}
			statCards={[
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
					value: `${show.vote_average.toFixed(1)}/10`,
				},
				{
					label: "Seasons",
					value: String(show.number_of_seasons),
				},
				{
					label: "Episodes",
					value: String(show.number_of_episodes),
				},
				{
					label: "Status",
					value: show.status,
				},
				{
					label: "Popularity",
					value: String(Math.round(show.popularity)),
				},
			]}
			tagline={show.tagline}
			title={show.name}
			titleTypeLabel="Show"
			trackerMedia={{
				backdropPath: show.backdrop_path,
				genreIds: show.genres.map((genre) => genre.id),
				mediaId: show.id,
				mediaType: "tv",
				overview: show.overview || "",
				posterPath: show.poster_path,
				releaseDate: show.first_air_date || "",
				title: show.name,
			}}
			trackerState={trackerState}
			type="tv"
			voteAverage={show.vote_average.toFixed(1)}
		/>
	);
}
