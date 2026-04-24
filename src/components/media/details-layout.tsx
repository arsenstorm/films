import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import type { ComponentProps } from "react";

import MediaTrackerActions from "@/components/media/tracker-actions";
import WatchProvidersPanel from "@/components/media/watch-providers-panel";
import type { MediaType } from "@/lib/media";
import type { MediaTrackerState, TrackableMediaInput } from "@/server/tracker";

const frostedSurfaceClassName =
	"shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_28px_80px_rgba(0,0,0,0.22)] [-webkit-backdrop-filter:blur(22px)] [backdrop-filter:blur(22px)]";
const posterFrameClassName =
	"relative overflow-hidden rounded-4xl bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_28px_80px_rgba(0,0,0,0.28)]";

type TransitionStyle = NonNullable<ComponentProps<"div">["style"]>;

interface MediaDetailsPageLayoutProps {
	backdropUrl: string | null;
	contentTransitionStyle: TransitionStyle;
	homepage: string | null;
	id: number;
	onWatchNowNavigation: () => void;
	overview: string;
	posterTransitionStyle: TransitionStyle;
	posterUrl: string | null;
	showWatchProviders?: boolean;
	tagline: string;
	taglineTransitionStyle: TransitionStyle;
	title: string;
	titleTransitionStyle: TransitionStyle;
	trackerMedia: TrackableMediaInput;
	trackerState: MediaTrackerState;
	type: MediaType;
}

function MediaDetailsPoster({
	posterTransitionStyle,
	posterUrl,
	title,
}: {
	posterTransitionStyle: TransitionStyle;
	posterUrl: string | null;
	title: string;
}) {
	return (
		<div className="flex justify-center lg:justify-end">
			<div className="w-auto" style={posterTransitionStyle}>
				<div className={posterFrameClassName}>
					{posterUrl ? (
						<img
							alt={title}
							className="pointer-events-none h-full max-h-108 w-auto max-w-92 select-none object-contain"
							height={750}
							src={posterUrl}
							width={500}
						/>
					) : (
						<div className="h-full w-full bg-white/10" />
					)}
				</div>
			</div>
		</div>
	);
}

function MediaDetailsContent({
	contentTransitionStyle,
	homepage,
	onWatchNowNavigation,
	overview,
	tagline,
	taglineTransitionStyle,
	title,
	titleTransitionStyle,
	trackerMedia,
	trackerState,
}: Omit<
	MediaDetailsPageLayoutProps,
	| "backdropUrl"
	| "id"
	| "posterTransitionStyle"
	| "posterUrl"
	| "showWatchProviders"
	| "type"
>) {
	return (
		<div className="space-y-6">
			<div className="max-w-3xl space-y-4">
				<h1
					className="max-w-3xl font-medium text-5xl text-white tracking-tight sm:text-6xl lg:text-7xl"
					style={titleTransitionStyle}
				>
					{title}
				</h1>
				{tagline ? (
					<p
						className="max-w-2xl text-lg text-white/72 italic sm:text-xl"
						style={taglineTransitionStyle}
					>
						{tagline}
					</p>
				) : null}
			</div>

			<div className="max-w-3xl" style={contentTransitionStyle}>
				<p className="text-base text-white/78 leading-7 sm:text-lg">
					{overview}
				</p>

				<div className="mt-6 flex flex-wrap items-center gap-3">
					<button
						className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-[#130f12] shadow-[0_14px_32px_rgba(255,255,255,0.12)] transition-colors duration-150 hover:bg-white/90"
						onClick={onWatchNowNavigation}
						type="button"
					>
						Watch now
						<ArrowRight className="size-5" />
					</button>
					{homepage ? (
						<a
							className={clsx(
								"inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 font-medium text-white transition-colors hover:bg-white/20",
								frostedSurfaceClassName,
								"rounded-full bg-white/8"
							)}
							href={homepage}
							rel="noreferrer"
							target="_blank"
						>
							Official site
						</a>
					) : null}
				</div>
				<div className="mt-3">
					<MediaTrackerActions
						initialState={trackerState}
						media={trackerMedia}
					/>
				</div>
			</div>
		</div>
	);
}

export function MediaDetailsPageLayout({
	backdropUrl,
	contentTransitionStyle,
	homepage,
	id,
	onWatchNowNavigation,
	overview,
	posterTransitionStyle,
	posterUrl,
	showWatchProviders = true,
	tagline,
	taglineTransitionStyle,
	title,
	titleTransitionStyle,
	trackerMedia,
	trackerState,
	type,
}: MediaDetailsPageLayoutProps) {
	return (
		<>
			<main className="relative isolate min-h-screen bg-black text-white">
				<section className="relative isolate min-h-screen overflow-hidden">
					<div className="absolute inset-0 bg-black">
						{backdropUrl ? (
							<img
								alt={title}
								className="h-full w-full select-none object-cover"
								height={720}
								src={backdropUrl}
								width={1280}
							/>
						) : null}
						<div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/20" />
					</div>

					<div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-12 sm:px-8 lg:px-10">
						<div className="mt-auto grid items-end gap-8 pb-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-12">
							<MediaDetailsContent
								contentTransitionStyle={contentTransitionStyle}
								homepage={homepage}
								onWatchNowNavigation={onWatchNowNavigation}
								overview={overview}
								tagline={tagline}
								taglineTransitionStyle={taglineTransitionStyle}
								title={title}
								titleTransitionStyle={titleTransitionStyle}
								trackerMedia={trackerMedia}
								trackerState={trackerState}
							/>
							<MediaDetailsPoster
								posterTransitionStyle={posterTransitionStyle}
								posterUrl={posterUrl}
								title={title}
							/>
						</div>
					</div>
				</section>
			</main>
			{showWatchProviders ? (
				<section className="relative -mt-10 bg-black pt-6 pb-16 text-white">
					<div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
						<WatchProvidersPanel id={id} type={type} />
					</div>
				</section>
			) : null}
		</>
	);
}
