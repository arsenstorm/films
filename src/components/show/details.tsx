import MediaDetailsPage from "@/components/media/details-page";
import { buildShowDetailsPageProps } from "@/components/media/details-view-model";

import type { ShowDetails } from "@/lib/tmdb";
import type { MediaTrackerState } from "@/server/tracker";

export default function ShowDetailsPageRoute({
	show,
	trackerState,
}: {
	show: ShowDetails;
	trackerState: MediaTrackerState;
}) {
	return (
		<MediaDetailsPage
			{...buildShowDetailsPageProps({
				show,
				trackerState,
			})}
		/>
	);
}
