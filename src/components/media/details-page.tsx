import { useLocation, useNavigate } from "@tanstack/react-router";

import { MediaDetailsPageLayout } from "@/components/media/details-layout";
import { getSafeRedirectPath } from "@/lib/auth";
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
	overview: string;
	posterLabel: string;
	posterUrl: string | null;
	quickTake: string;
	releaseYear: string;
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
	backLabel,
	backdropUrl,
	heroPills,
	homepage,
	id,
	overview,
	posterUrl,
	tagline,
	title,
	trackerMedia,
	trackerState,
	type,
}: MediaDetailsPageProps) {
	const location = useLocation();
	const navigate = useNavigate();
	let rawReturnToHref: unknown;

	if (location.state && typeof location.state === "object") {
		rawReturnToHref =
			"returnToHref" in location.state
				? location.state.returnToHref
				: undefined;
	}

	const returnToHref =
		typeof rawReturnToHref === "string"
			? getSafeRedirectPath(rawReturnToHref)
			: null;
	let resolvedBackLabel = backLabel;

	if (returnToHref?.startsWith("/recommendations")) {
		resolvedBackLabel = "Back to recommendations";
	} else if (returnToHref?.startsWith("/all")) {
		resolvedBackLabel = "Back to all";
	}

	function handleBackNavigation(): void {
		const targetHref = returnToHref ?? `/${type}`;

		navigate({
			href: targetHref,
			viewTransition: {
				types: ["media-detail-exit"],
			},
		}).catch(() => {
			return undefined;
		});
	}

	function handleWatchNowNavigation(): void {
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
			backLabel={resolvedBackLabel}
			backLinkTransitionStyle={{
				viewTransitionClass: "media-detail-secondary",
				viewTransitionName: getMediaViewTransitionName(type, id, "back-link"),
			}}
			contentTransitionStyle={{
				viewTransitionClass: "media-detail-secondary",
				viewTransitionName: getMediaViewTransitionName(type, id, "content"),
			}}
			heroPills={heroPills}
			homepage={homepage}
			id={id}
			metaTransitionStyle={{
				viewTransitionClass: "media-detail-secondary",
				viewTransitionName: getMediaViewTransitionName(type, id, "meta"),
			}}
			onBackNavigation={handleBackNavigation}
			onWatchNowNavigation={handleWatchNowNavigation}
			overview={overview}
			posterTransitionStyle={{
				viewTransitionClass: "media-detail-poster",
				viewTransitionName: getMediaViewTransitionName(type, id, "poster"),
			}}
			posterUrl={posterUrl}
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
