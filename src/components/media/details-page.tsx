import { useLocation } from "@tanstack/react-router";

import { MediaDetailsPageLayout } from "@/components/media/details-layout";
import {
	getBrowseHref,
	getMediaViewTransitionName,
	type MediaType,
} from "@/lib/media";
import type { MediaTrackerState, TrackableMediaInput } from "@/server/tracker";

export interface MediaDetailsFact {
	label: string;
	value: string;
}

export interface MediaDetailsPageProps {
	aboutLabel: string;
	backdropUrl: string | null;
	backLabel: string;
	facts: MediaDetailsFact[];
	genres: string[];
	heroPills: string[];
	homepage: string | null;
	id: number;
	onWatchNow?: () => void;
	overview: string;
	posterLabel: string;
	posterUrl: string | null;
	quickTake: string;
	releaseYear: string;
	showWatchProviders?: boolean;
	statCards: MediaDetailsFact[];
	tagline: string;
	title: string;
	titleTypeLabel: string;
	trackerMedia: TrackableMediaInput;
	trackerState: MediaTrackerState;
	type: MediaType;
	voteAverage: string;
}

export default function MediaDetailsPage({
	backdropUrl,
	homepage,
	id,
	onWatchNow,
	overview,
	posterUrl,
	showWatchProviders,
	tagline,
	title,
	trackerMedia,
	trackerState,
	type,
}: MediaDetailsPageProps) {
	const location = useLocation();

	function handleWatchNowNavigation(): void {
		if (onWatchNow) {
			onWatchNow();
			return;
		}

		const watchHref = getBrowseHref(`/${type}/${id}/watch`, {
			page: "page" in location.search ? (location.search.page ?? 1) : 1,
			q: "q" in location.search ? (location.search.q ?? "") : "",
			view:
				"view" in location.search
					? (location.search.view ?? "discover")
					: "discover",
		});

		window.location.assign(watchHref);
	}

	return (
		<MediaDetailsPageLayout
			backdropUrl={backdropUrl}
			contentTransitionStyle={{
				viewTransitionClass: "media-detail-secondary",
				viewTransitionName: getMediaViewTransitionName(type, id, "content"),
			}}
			homepage={homepage}
			id={id}
			onWatchNowNavigation={handleWatchNowNavigation}
			overview={overview}
			posterTransitionStyle={{
				viewTransitionClass: "media-detail-poster",
				viewTransitionName: getMediaViewTransitionName(type, id, "poster"),
			}}
			posterUrl={posterUrl}
			showWatchProviders={showWatchProviders}
			tagline={tagline}
			taglineTransitionStyle={{
				viewTransitionClass: "media-detail-secondary",
				viewTransitionName: getMediaViewTransitionName(type, id, "tagline"),
			}}
			title={title}
			titleTransitionStyle={{
				viewTransitionClass: "media-detail-secondary",
				viewTransitionName: getMediaViewTransitionName(type, id, "title"),
			}}
			trackerMedia={trackerMedia}
			trackerState={trackerState}
			type={type}
		/>
	);
}
