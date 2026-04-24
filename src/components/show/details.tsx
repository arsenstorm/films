import MediaDetailsPage from "@/components/media/details-page";
import { buildShowDetailsPageProps } from "@/components/media/details-view-model";
import EpisodesSection from "@/components/show/episodes-section";
import type { SeasonDetails, ShowDetails } from "@/lib/tmdb";
import type { MediaTrackerState } from "@/server/tracker";

function scrollToEpisodes(): void {
	document.getElementById("episodes")?.scrollIntoView({
		behavior: "smooth",

		block: "start",
	});
}

export default function ShowDetailsPageRoute({
	season,
	show,
	trackerState,
}: {
	season: SeasonDetails | null;
	show: ShowDetails;
	trackerState: MediaTrackerState;
}) {
	return (
		<>
			<MediaDetailsPage
				{...buildShowDetailsPageProps({
					show,
					trackerState,
				})}
				onWatchNow={scrollToEpisodes}
				showWatchProviders={false}
			/>
			<EpisodesSection season={season} show={show} />
		</>
	);
}
