import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import {
	motion,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { DEFAULT_BROWSE_SEARCH } from "@/lib/media";
import {
	getRecommendationQueryKey,
	getRecommendationQueueQueryKey,
} from "@/lib/query";
import {
	getRecommendationMediaKey,
	mergeRecommendationQueues,
	removeRecommendationFromBatch,
	removeRecommendationFromQueue,
} from "@/lib/recommendation-queue";
import {
	type BrowseMediaItem,
	getGenreNames,
	getReleaseYear,
	getTmdbImageUrl,
} from "@/lib/tmdb";
import {
	getRecommendationFn,
	type RecommendationBatchResult,
	type RecommendationFeedbackAction,
	type RecommendationResult,
	recordRecommendationFeedbackFn,
	recordRecommendationImpressionFn,
} from "@/server/recommendations";
import type { TrackableMediaInput } from "@/server/tracker";

const SWIPE_THRESHOLD_PX = 110;
const CARD_EXIT_DISTANCE_PX = 220;
const CARD_EXIT_DURATION_MS = 180;
const DRAG_TAP_SUPPRESSION_MS = 250;
const RECOMMENDATION_REFILL_THRESHOLD = 3;

function getRecommendationTitle(media: BrowseMediaItem): string {
	return media.mediaType === "movies" ? media.title : media.name;
}

function getRecommendationReleaseDate(media: BrowseMediaItem): string {
	return media.mediaType === "movies"
		? media.release_date
		: media.first_air_date;
}

function toTrackableMediaInput(media: BrowseMediaItem): TrackableMediaInput {
	if (media.mediaType === "movies") {
		return {
			backdropPath: media.backdrop_path,
			genreIds: media.genre_ids,
			mediaId: media.id,
			mediaType: "movies",
			overview: media.overview ?? "",
			posterPath: media.poster_path,
			releaseDate: media.release_date ?? "",
			title: media.title,
		};
	}

	return {
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

function getErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: "Something went wrong while loading your recommendation.";
}

function waitForCardExit(): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, CARD_EXIT_DURATION_MS);
	});
}

function RecommendationShell({ children }: { children: React.ReactNode }) {
	return (
		<main className="isolate min-h-dvh bg-zinc-100 px-4 py-4 antialiased sm:px-6 sm:py-6 dark:bg-zinc-950">
			<div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-5xl flex-col sm:min-h-[calc(100dvh-3rem)]">
				{children}
			</div>
		</main>
	);
}

function RecommendationHeader() {
	return (
		<header className="px-1 py-1 sm:px-0 sm:py-0">
			<Link
				className="relative inline-flex items-center gap-2 px-1 py-2 font-medium text-sm text-zinc-600 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 dark:text-zinc-300 dark:hover:text-zinc-50"
				params={{ type: "all" }}
				search={DEFAULT_BROWSE_SEARCH}
				to="/$type"
			>
				<span className="-translate-1/2 absolute top-1/2 left-1/2 pointer-fine:hidden size-[max(100%,3rem)]" />
				<ArrowLeft className="size-5 sm:size-4" />
				Back to library
			</Link>
		</header>
	);
}

function RecommendationLoadingState() {
	return (
		<RecommendationShell>
			<RecommendationHeader />
			<div className="flex flex-1 items-center justify-center px-5 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
				<div className="w-full max-w-sm animate-pulse space-y-4">
					<div className="rounded-3xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800/80 dark:bg-zinc-900">
						<div className="flex items-start justify-between gap-4">
							<div className="h-8 w-40 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
							<div className="h-6 w-10 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
						</div>
						<div className="my-6 aspect-2/3 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
						<div className="h-6 w-3/4 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
					</div>
					<div className="h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
				</div>
			</div>
		</RecommendationShell>
	);
}

function RecommendationErrorState({
	errorMessage,
	onRetry,
}: {
	errorMessage: string;
	onRetry: () => void;
}) {
	return (
		<RecommendationShell>
			<RecommendationHeader />
			<div className="flex flex-1 items-center justify-center px-5 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
				<div className="w-full max-w-xl space-y-5 text-center">
					<h1 className="mx-auto max-w-[16ch] text-balance font-medium text-4xl text-zinc-950 tracking-tight sm:text-5xl dark:text-zinc-50">
						We couldn&apos;t load a pick right now.
					</h1>
					<p className="mx-auto max-w-[42ch] text-pretty text-base/7 text-zinc-600 sm:text-sm/6 dark:text-zinc-300">
						{errorMessage}
					</p>
					<button
						className="inline-flex min-h-12 items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 font-medium text-base text-white outline-offset-2 ring-1 ring-zinc-950 transition-transform focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.99] sm:text-sm dark:bg-zinc-100 dark:text-zinc-950 dark:ring-zinc-100"
						onClick={onRetry}
						type="button"
					>
						<RefreshCcw className="size-5 sm:size-4" />
						Try again
					</button>
				</div>
			</div>
		</RecommendationShell>
	);
}

function RecommendationEmptyState() {
	return (
		<RecommendationShell>
			<RecommendationHeader />
			<div className="flex flex-1 items-center justify-center px-5 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
				<div className="w-full max-w-xl space-y-5 text-center">
					<h1 className="mx-auto max-w-[16ch] text-balance font-medium text-4xl text-zinc-950 tracking-tight sm:text-5xl dark:text-zinc-50">
						We need a bit more signal first.
					</h1>
					<p className="mx-auto max-w-[44ch] text-pretty text-base/7 text-zinc-600 sm:text-sm/6 dark:text-zinc-300">
						Favourite a few titles, mark something as watched, or add a
						watchlist entry and this page will start surfacing picks that feel
						much less random.
					</p>
					<Link
						className="inline-flex min-h-9 items-center rounded-full border border-zinc-200/80 bg-white px-4 py-2 font-medium text-sm text-zinc-950 ring-1 ring-black/5 transition-transform focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 active:scale-[0.99] dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10"
						params={{ type: "all" }}
						search={DEFAULT_BROWSE_SEARCH}
						to="/$type"
					>
						Back to library
					</Link>
				</div>
			</div>
		</RecommendationShell>
	);
}

function RecommendationCard({
	actionError,
	dragX,
	dragXOpacity,
	dragXRotate,
	exitDirection,
	isWorking,
	onDecline,
	onLike,
	onOpenDetails,
	recommendation,
	shouldReduceMotion,
}: {
	actionError: string | null;
	dragX: ReturnType<typeof useMotionValue<number>>;
	dragXOpacity: ReturnType<typeof useMotionValue<number>>;
	dragXRotate: ReturnType<typeof useMotionValue<number>>;
	exitDirection: -1 | 0 | 1;
	isWorking: boolean;
	onDecline: () => void;
	onLike: () => void;
	onOpenDetails: () => void;
	recommendation: RecommendationResult;
	shouldReduceMotion: boolean | null;
}) {
	const title = getRecommendationTitle(recommendation.media);
	const releaseYear = getReleaseYear(
		getRecommendationReleaseDate(recommendation.media)
	);
	const lastDragEndedAtRef = useRef<number>(0);
	const genres = getGenreNames(recommendation.media.genre_ids.slice(0, 2));
	const posterUrl = getTmdbImageUrl(
		recommendation.media.poster_path ?? recommendation.media.backdrop_path,
		"w500"
	);
	const recommendationKey = `${recommendation.media.mediaType}:${recommendation.media.id}`;

	return (
		<div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 sm:min-w-104">
			<motion.div
				animate={{
					filter:
						shouldReduceMotion || exitDirection === 0
							? "blur(0px)"
							: "blur(18px)",
					opacity: exitDirection === 0 ? 1 : 0,
				}}
				className="flex w-full flex-col items-center gap-5"
				initial={
					shouldReduceMotion
						? false
						: {
								filter: "blur(18px)",
								opacity: 0,
							}
				}
				key={recommendationKey}
				transition={{
					duration: shouldReduceMotion ? 0 : 0.22,
					ease: "easeOut",
				}}
			>
				<h2 className="max-w-[22ch] text-balance text-center font-medium text-2xl text-zinc-950 tracking-tight sm:text-3xl dark:text-zinc-50">
					{recommendation.reason}
				</h2>

				<motion.article
					animate={{
						x: exitDirection === 0 ? 0 : exitDirection * CARD_EXIT_DISTANCE_PX,
					}}
					aria-disabled={isWorking}
					className="group relative w-fit cursor-pointer rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-[0_24px_60px_rgba(24,24,27,0.12)] transition-colors duration-150 ease-out hover:bg-zinc-200 dark:border-zinc-800/80 dark:bg-zinc-900 dark:hover:bg-zinc-800"
					drag={isWorking ? false : "x"}
					dragElastic={0.18}
					dragMomentum={false}
					dragSnapToOrigin
					onDragEnd={(_event, info) => {
						lastDragEndedAtRef.current = Date.now();

						if (
							info.offset.x <= -SWIPE_THRESHOLD_PX ||
							info.velocity.x <= -550
						) {
							onDecline();
							return;
						}

						if (info.offset.x >= SWIPE_THRESHOLD_PX || info.velocity.x >= 550) {
							onLike();
						}
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							if (!isWorking) {
								onOpenDetails();
							}
						}
					}}
					onTap={() => {
						if (
							!isWorking &&
							Date.now() - lastDragEndedAtRef.current > DRAG_TAP_SUPPRESSION_MS
						) {
							onOpenDetails();
						}
					}}
					role="button"
					style={{
						opacity: shouldReduceMotion ? 1 : dragXOpacity,
						rotate: shouldReduceMotion ? 0 : dragXRotate,
						x: dragX,
					}}
					tabIndex={isWorking ? -1 : 0}
					transition={{
						duration: shouldReduceMotion ? 0 : 0.18,
						ease: "easeOut",
					}}
				>
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 flex-1">
							<h1 className="line-clamp-1 max-w-[22ch] truncate font-medium text-sm text-zinc-600 dark:text-zinc-300">
								{title}
							</h1>
						</div>
						<div className="text-right">
							<p className="text-sm text-zinc-600 tabular-nums dark:text-zinc-300">
								{releaseYear}
							</p>
						</div>
					</div>

					<div className="relative mx-6 my-4 aspect-2/3 max-w-52 select-none overflow-hidden rounded-2xl bg-zinc-200 shadow-2xl dark:bg-zinc-800">
						{posterUrl ? (
							<img
								alt={title}
								className="pointer-events-none h-full w-full select-none object-cover"
								draggable={false}
								height={750}
								src={posterUrl}
								width={500}
							/>
						) : (
							<div className="absolute inset-0 bg-linear-to-br from-zinc-300 via-zinc-200 to-zinc-100 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950" />
						)}
					</div>

					{genres.length > 0 ? (
						<p className="text-base/7 text-zinc-600 sm:text-sm/6 dark:text-zinc-300">
							{genres.join(" ∙ ")}
						</p>
					) : null}
				</motion.article>

				<div className="max-w-[40ch] space-y-3 text-center">
					<p className="text-base/7 text-zinc-600 sm:text-sm/6 dark:text-zinc-300">
						{recommendation.media.overview ||
							"This title fits the taste profile built from what you already save, finish, and favourite."}
					</p>
				</div>
			</motion.div>

			{actionError ? (
				<p
					className="w-full max-w-sm rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-center text-base/7 text-red-700 sm:text-sm/6 dark:border-red-950 dark:bg-red-950/40 dark:text-red-200"
					role="alert"
				>
					{actionError}
				</p>
			) : null}
		</div>
	);
}

export default function RecommendationsPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const shouldReduceMotion = useReducedMotion();
	const dragX = useMotionValue(0);
	const dragXRotate = useTransform(dragX, [-180, 0, 180], [-5, 0, 5]);
	const dragXOpacity = useTransform(dragX, [-220, 0, 220], [0.86, 1, 0.86]);
	const [actionError, setActionError] = useState<string | null>(null);
	const [exitDirection, setExitDirection] = useState<-1 | 0 | 1>(0);
	const [queue, setQueue] = useState<RecommendationResult[]>(
		() =>
			queryClient.getQueryData<RecommendationResult[]>(
				getRecommendationQueueQueryKey()
			) ?? []
	);
	const loggedImpressionKeysRef = useRef<Set<string>>(new Set());
	const shownRecommendationCountRef = useRef(0);
	const { data, error, isFetching, isLoading, refetch } = useQuery({
		queryFn: () => getRecommendationFn(),
		queryKey: getRecommendationQueryKey(),
	});
	const feedbackMutation = useMutation({
		mutationFn: async ({
			action,
			media,
		}: {
			action: RecommendationFeedbackAction;
			media: TrackableMediaInput;
		}) =>
			recordRecommendationFeedbackFn({
				data: {
					action,
					media,
				},
			}),
	});
	const currentRecommendation = queue[0] ?? null;
	const isWorking = feedbackMutation.isPending || exitDirection !== 0;

	useEffect(() => {
		setQueue((currentQueue) =>
			mergeRecommendationQueues(currentQueue, data ?? null)
		);
	}, [data]);

	useEffect(() => {
		queryClient.setQueryData(getRecommendationQueueQueryKey(), queue);
	}, [queryClient, queue]);

	useEffect(() => {
		if (!currentRecommendation) {
			return;
		}

		const mediaKey = getRecommendationMediaKey(currentRecommendation.media);

		if (loggedImpressionKeysRef.current.has(mediaKey)) {
			return;
		}

		loggedImpressionKeysRef.current.add(mediaKey);
		const position = shownRecommendationCountRef.current;
		shownRecommendationCountRef.current += 1;

		recordRecommendationImpressionFn({
			data: {
				mediaId: currentRecommendation.media.id,
				mediaType: currentRecommendation.media.mediaType,
				position,
				source: currentRecommendation.source,
			},
		}).catch(() => {
			loggedImpressionKeysRef.current.delete(mediaKey);
			shownRecommendationCountRef.current = Math.max(0, position);
			return undefined;
		});
	}, [currentRecommendation]);

	async function handleFeedback(
		action: RecommendationFeedbackAction,
		direction: -1 | 1
	): Promise<void> {
		if (!(currentRecommendation && !isWorking)) {
			return;
		}

		setActionError(null);
		setExitDirection(direction);
		dragX.set(0);

		try {
			if (!shouldReduceMotion) {
				await waitForCardExit();
			}

			await feedbackMutation.mutateAsync({
				action,
				media: toTrackableMediaInput(currentRecommendation.media),
			});
			const nextQueue = removeRecommendationFromQueue(
				queue,
				currentRecommendation.media
			);

			queryClient.setQueryData(
				getRecommendationQueryKey(),
				(currentBatch: RecommendationBatchResult | null | undefined) =>
					removeRecommendationFromBatch(
						currentBatch ?? null,
						currentRecommendation.media
					)
			);

			setQueue(nextQueue);

			if (nextQueue.length === 0) {
				await refetch();
			} else if (nextQueue.length <= RECOMMENDATION_REFILL_THRESHOLD) {
				refetch().catch((refetchError) => {
					setActionError(getErrorMessage(refetchError));
					return undefined;
				});
			}
		} catch (mutationError) {
			setActionError(getErrorMessage(mutationError));
		} finally {
			setExitDirection(0);
			dragX.set(0);
		}
	}

	async function handleOpenDetails(): Promise<void> {
		if (!(currentRecommendation && !isWorking)) {
			return;
		}

		setActionError(null);

		try {
			await navigate({
				params: {
					id: String(currentRecommendation.media.id),
					type: currentRecommendation.media.mediaType,
				},
				search: DEFAULT_BROWSE_SEARCH,
				state: (currentState) => ({
					...currentState,
					returnToHref: "/recommendations",
				}),
				to: "/$type/$id",
			});
		} catch (mutationError) {
			setActionError(getErrorMessage(mutationError));
		}
	}

	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (
			event.defaultPrevented ||
			event.metaKey ||
			event.ctrlKey ||
			event.altKey ||
			!currentRecommendation ||
			isWorking
		) {
			return;
		}

		if (event.key === "ArrowLeft") {
			event.preventDefault();
			handleFeedback("declined", -1).catch(() => {
				return undefined;
			});
		}

		if (event.key === "ArrowRight") {
			event.preventDefault();
			handleFeedback("accepted", 1).catch(() => {
				return undefined;
			});
		}

		if (event.key === "Enter") {
			event.preventDefault();
			handleOpenDetails().catch(() => {
				return undefined;
			});
		}
	});

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	if (isLoading || (isFetching && !currentRecommendation)) {
		return <RecommendationLoadingState />;
	}

	if (error && !currentRecommendation) {
		return (
			<RecommendationErrorState
				errorMessage={getErrorMessage(error)}
				onRetry={() => {
					refetch().catch(() => {
						return undefined;
					});
				}}
			/>
		);
	}

	if (!currentRecommendation) {
		return <RecommendationEmptyState />;
	}

	return (
		<RecommendationShell>
			<RecommendationHeader />
			<div className="flex flex-1 items-center justify-center px-5 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
				<div className="w-full">
					<RecommendationCard
						actionError={actionError}
						dragX={dragX}
						dragXOpacity={dragXOpacity}
						dragXRotate={dragXRotate}
						exitDirection={exitDirection}
						isWorking={isWorking}
						onDecline={() => {
							handleFeedback("declined", -1).catch(() => {
								return undefined;
							});
						}}
						onLike={() => {
							handleFeedback("accepted", 1).catch(() => {
								return undefined;
							});
						}}
						onOpenDetails={() => {
							handleOpenDetails().catch(() => {
								return undefined;
							});
						}}
						recommendation={currentRecommendation}
						shouldReduceMotion={shouldReduceMotion}
					/>
				</div>
			</div>
		</RecommendationShell>
	);
}
