import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calligraph } from "calligraph";
import clsx from "clsx";
import {
	CircleCheckBig,
	Eye,
	Heart,
	ListChecks,
	ListPlus,
	LoaderCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

import {
	getMediaTrackerStateQueryKey,
	getRecommendationQueryKey,
} from "@/lib/query";
import {
	type MediaTrackerState,
	type TrackableMediaInput,
	updateMediaTrackerStateFn,
} from "@/server/tracker";

const trackerButtonBaseClassName =
	"inline-flex min-h-12 items-center gap-3 rounded-full px-5 py-3 text-left font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_28px_80px_rgba(0,0,0,0.22)] transition-[background-color,box-shadow,transform,opacity] duration-200 ease-out active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 [-webkit-backdrop-filter:blur(22px)] [backdrop-filter:blur(22px)]";
const trackerButtonActiveClassName =
	"bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_1px_rgba(255,255,255,0.14),0_28px_80px_rgba(0,0,0,0.28)] hover:bg-white/16";
const trackerButtonInactiveClassName = "bg-white/8 hover:bg-white/16";

interface TrackerActionConfig {
	activeIcon: typeof ListPlus;
	activeIconClassName: string;
	activeLabel: string;
	addingLabel: string;
	inactiveIcon: typeof ListPlus;
	inactiveLabel: string;
	key: keyof MediaTrackerState;
	label: string;
	removingLabel: string;
}

interface MediaTrackerActionsProps {
	initialState: MediaTrackerState;
	media: TrackableMediaInput;
}

interface TrackerMutationInput {
	actionKey: keyof MediaTrackerState;
	nextState: MediaTrackerState;
	nextValue: boolean;
}

const trackerActions: TrackerActionConfig[] = [
	{
		activeLabel: "In watchlist",
		activeIcon: ListChecks,
		activeIconClassName: "text-sky-200/90",
		addingLabel: "Adding...",
		inactiveLabel: "Add to watchlist",
		inactiveIcon: ListPlus,
		key: "isInWatchlist",
		label: "Watchlist",
		removingLabel: "Removing...",
	},
	{
		activeLabel: "Favourited",
		activeIcon: Heart,
		activeIconClassName: "text-rose-200/90",
		addingLabel: "Favouriting...",
		inactiveLabel: "Favourite",
		inactiveIcon: Heart,
		key: "isFavorite",
		label: "Favourite",
		removingLabel: "Unfavouriting...",
	},
	{
		activeLabel: "Watched",
		activeIcon: CircleCheckBig,
		activeIconClassName: "text-emerald-200/90",
		addingLabel: "Marking...",
		inactiveLabel: "Watched?",
		inactiveIcon: Eye,
		key: "isWatched",
		label: "Watched",
		removingLabel: "Unmarking...",
	},
];

function TrackerActionIcon({
	action,
	isActive,
	isPending,
}: {
	action: TrackerActionConfig;
	isActive: boolean;
	isPending: boolean;
}) {
	const Icon = isActive ? action.activeIcon : action.inactiveIcon;
	const iconKey = isPending
		? `${action.key}-pending`
		: `${action.key}-${isActive}`;

	return (
		<span className="relative flex size-5 shrink-0 items-center justify-center">
			<AnimatePresence initial={false} mode="wait">
				{isPending ? (
					<motion.span
						animate={{ opacity: 1, rotate: 360, scale: 1 }}
						className="absolute inset-0 flex items-center justify-center"
						exit={{ opacity: 0, scale: 0.8 }}
						initial={{ opacity: 0, rotate: 0, scale: 0.8 }}
						key={iconKey}
						transition={{
							opacity: { duration: 0.16, ease: "easeOut" },
							rotate: {
								duration: 0.9,
								ease: "linear",
								repeat: Number.POSITIVE_INFINITY,
							},
							scale: { duration: 0.16, ease: "easeOut" },
						}}
					>
						<LoaderCircle className="size-5" />
					</motion.span>
				) : (
					<motion.span
						animate={{ opacity: 1, scale: 1, y: 0 }}
						className="absolute inset-0 flex items-center justify-center"
						exit={{ opacity: 0, scale: 0.82, y: -2 }}
						initial={{ opacity: 0, scale: 0.82, y: 2 }}
						key={iconKey}
						transition={{
							duration: 0.18,
							ease: "easeOut",
						}}
					>
						<Icon
							className={clsx(
								"size-5",
								isActive ? action.activeIconClassName : "text-white/88",
								action.key === "isFavorite" && isActive ? "fill-current" : null
							)}
						/>
					</motion.span>
				)}
			</AnimatePresence>
		</span>
	);
}

export default function MediaTrackerActions({
	initialState,
	media,
}: MediaTrackerActionsProps) {
	const queryClient = useQueryClient();
	const trackerStateRef = useRef(initialState);
	const [pendingActions, setPendingActions] = useState<
		Partial<Record<keyof MediaTrackerState, number>>
	>({});
	const [trackerState, setTrackerState] = useState(initialState);

	const setTrackerStateValue = (
		updater:
			| MediaTrackerState
			| ((currentState: MediaTrackerState) => MediaTrackerState)
	) => {
		setTrackerState((currentState) => {
			const nextState =
				typeof updater === "function" ? updater(currentState) : updater;
			trackerStateRef.current = nextState;
			return nextState;
		});
	};

	const mutation = useMutation({
		mutationFn: async ({ nextState }: TrackerMutationInput) =>
			updateMediaTrackerStateFn({
				data: {
					media,
					state: nextState,
				},
			}),
		onMutate: async ({ actionKey, nextValue }) => {
			let previousValue = false;

			setPendingActions((currentState) => ({
				...currentState,
				[actionKey]: (currentState[actionKey] ?? 0) + 1,
			}));
			setTrackerStateValue((currentState) => {
				previousValue = currentState[actionKey];
				return {
					...currentState,
					[actionKey]: nextValue,
				};
			});

			await queryClient.cancelQueries({
				queryKey: getMediaTrackerStateQueryKey({
					mediaId: media.mediaId,
					mediaType: media.mediaType,
				}),
			});

			queryClient.setQueryData(
				getMediaTrackerStateQueryKey({
					mediaId: media.mediaId,
					mediaType: media.mediaType,
				}),
				(currentState: MediaTrackerState | undefined) =>
					currentState
						? {
								...currentState,
								[actionKey]: nextValue,
							}
						: undefined
			);

			return {
				actionKey,
				previousValue,
			};
		},
		onError: (_error, _variables, context) => {
			if (context) {
				setTrackerStateValue((currentState) => ({
					...currentState,
					[context.actionKey]: context.previousValue,
				}));
				queryClient.setQueryData(
					getMediaTrackerStateQueryKey({
						mediaId: media.mediaId,
						mediaType: media.mediaType,
					}),
					(currentState: MediaTrackerState | undefined) =>
						currentState
							? {
									...currentState,
									[context.actionKey]: context.previousValue,
								}
							: undefined
				);
			}
		},
		onSuccess: (savedState, variables) => {
			setTrackerStateValue((currentState) => {
				const nextState = { ...savedState };

				for (const action of trackerActions) {
					if (
						action.key !== variables.actionKey &&
						(pendingActions[action.key] ?? 0) > 0
					) {
						nextState[action.key] = currentState[action.key];
					}
				}

				return nextState;
			});
			queryClient.setQueryData(
				getMediaTrackerStateQueryKey({
					mediaId: media.mediaId,
					mediaType: media.mediaType,
				}),
				savedState
			);
		},
		onSettled: async (_data, _error, variables) => {
			setPendingActions((currentState) => {
				const nextCount = (currentState[variables.actionKey] ?? 0) - 1;

				if (nextCount > 0) {
					return {
						...currentState,
						[variables.actionKey]: nextCount,
					};
				}

				const { [variables.actionKey]: _removed, ...nextState } = currentState;
				return nextState;
			});
			await queryClient.invalidateQueries({
				predicate: (query) =>
					Array.isArray(query.queryKey) &&
					query.queryKey[0] === "browse-media" &&
					(query.queryKey[1] === media.mediaType ||
						query.queryKey[1] === "all"),
			});
			await queryClient.invalidateQueries({
				queryKey: getRecommendationQueryKey(),
			});
		},
	});

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-3">
				{trackerActions.map((action) => {
					const isActive = trackerState[action.key];
					const isPending = (pendingActions[action.key] ?? 0) > 0;
					let buttonText = action.inactiveLabel;

					if (isPending) {
						buttonText = isActive ? action.addingLabel : action.removingLabel;
					} else if (isActive) {
						buttonText = action.activeLabel;
					}

					return (
						<button
							aria-pressed={isActive}
							className={clsx(
								trackerButtonBaseClassName,
								isActive
									? trackerButtonActiveClassName
									: trackerButtonInactiveClassName,
								isPending ? "opacity-90" : null
							)}
							key={action.key}
							onClick={() => {
								const nextValue = !trackerStateRef.current[action.key];

								mutation.mutate({
									actionKey: action.key,
									nextState: {
										...trackerStateRef.current,
										[action.key]: nextValue,
									},
									nextValue,
								});
							}}
							type="button"
						>
							<TrackerActionIcon
								action={action}
								isActive={isActive}
								isPending={isPending}
							/>
							<Calligraph
								animation="smooth"
								as="span"
								className="font-medium"
								drift={{ x: 10 }}
								stagger={0.012}
							>
								{buttonText}
							</Calligraph>
						</button>
					);
				})}
			</div>
		</div>
	);
}
