import MediaDetailsPage from "@/components/media/details-page";
import { buildMovieDetailsPageProps } from "@/components/media/details-view-model";

import type { MovieDetails } from "@/lib/tmdb";
import type { MediaTrackerState } from "@/server/tracker";

export default function MovieDetailsPageRoute({
	movie,
	trackerState,
}: {
	movie: MovieDetails;
	trackerState: MediaTrackerState;
}) {
	return (
		<MediaDetailsPage
			{...buildMovieDetailsPageProps({
				movie,
				trackerState,
			})}
		/>
	);
}
