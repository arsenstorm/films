import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { DEFAULT_BROWSE_SEARCH } from "@/lib/media";
import { toTrackableBrowseMediaInput } from "@/lib/media-adapters";
import { getRecommendationQueueQueryKey } from "@/lib/query";
import {
	getRecommendationMediaKey,
	mergeRecommendationQueues,
	removeRecommendationFromQueue,
} from "@/lib/recommendation-queue";
import {
	getRecommendationsErrorMessage,
	isRecommendationRouteId,
} from "@/lib/recommendations";
import {
	type RecommendationBatchResult,
	type RecommendationFeedbackAction,
	type RecommendationResult,
	recordRecommendationFeedbackFn,
	recordRecommendationImpressionFn,
} from "@/server/recommendations";

const SWIPE_THRESHOLD_PX = 110;
const CARD_EXIT_DURATION_MS = 180;
const RECOMMENDATION_REFILL_THRESHOLD = 3;

function waitForCardExit(): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, CARD_EXIT_DURATION_MS);
	});
}

async function invalidateRecommendationRoutes(
	router: ReturnType<typeof useRouter>,
	options?: {
		sync?: boolean;
	}
): Promise<void> {
	await router.invalidate({
		filter: (match) => isRecommendationRouteId(match.routeId),
		sync: options?.sync,
	});
}

export function useRecommendationsController({
	data,
}: {
	data: RecommendationBatchResult | null;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();
	const dragX = useMotionValue(0);
	const dragXRotate = useTransform(dragX, [-180, 0, 180], [-5, 0, 5]);
	const dragXOpacity = useTransform(dragX, [-220, 0, 220], [0.86, 1, 0.86]);
	const [actionError, setActionError] = useState<string | null>(null);
	const [exitDirection, setExitDirection] = useState<-1 | 0 | 1>(0);
	const [isReloading, setIsReloading] = useState(false);
	const [reloadError, setReloadError] = useState<string | null>(null);
	const [queue, setQueue] = useState<RecommendationResult[]>(() =>
		mergeRecommendationQueues(
			queryClient.getQueryData<RecommendationResult[]>(
				getRecommendationQueueQueryKey()
			) ?? [],
			data
		)
	);
	const isMountedRef = useRef(true);
	const loggedImpressionKeysRef = useRef<Set<string>>(new Set());
	const shownRecommendationCountRef = useRef(0);
	const feedbackMutation = useMutation({
		mutationFn: async ({
			action,
			recommendation,
		}: {
			action: RecommendationFeedbackAction;
			recommendation: RecommendationResult;
		}) =>
			recordRecommendationFeedbackFn({
				data: {
					action,
					media: toTrackableBrowseMediaInput(recommendation.media),
				},
			}),
	});
	const currentRecommendation = queue[0] ?? null;
	const isWorking = feedbackMutation.isPending || exitDirection !== 0;

	useEffect(() => {
		isMountedRef.current = true;

		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		setQueue((currentQueue) => mergeRecommendationQueues(currentQueue, data));
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

	async function reloadRecommendations(options?: {
		reportError?: boolean;
		sync?: boolean;
	}): Promise<void> {
		if (isMountedRef.current) {
			setIsReloading(true);
			setReloadError(null);
		}

		try {
			await invalidateRecommendationRoutes(router, {
				sync: options?.sync,
			});
		} catch (error) {
			const errorMessage = getRecommendationsErrorMessage(error);

			if (isMountedRef.current) {
				if (options?.reportError) {
					setReloadError(errorMessage);
				} else {
					setActionError(errorMessage);
				}
			}
		} finally {
			if (isMountedRef.current) {
				setIsReloading(false);
			}
		}
	}

	async function handleFeedback(
		action: RecommendationFeedbackAction,
		direction: -1 | 1
	): Promise<void> {
		if (!(currentRecommendation && !isWorking)) {
			return;
		}

		setActionError(null);
		setReloadError(null);
		setExitDirection(direction);
		dragX.set(0);

		try {
			if (!shouldReduceMotion) {
				await waitForCardExit();
			}

			await feedbackMutation.mutateAsync({
				action,
				recommendation: currentRecommendation,
			});
			const nextQueue = removeRecommendationFromQueue(
				queue,
				currentRecommendation.media
			);

			setQueue(nextQueue);

			if (nextQueue.length === 0) {
				await reloadRecommendations({
					reportError: true,
					sync: true,
				});
			} else if (nextQueue.length <= RECOMMENDATION_REFILL_THRESHOLD) {
				reloadRecommendations().catch(() => {
					return undefined;
				});
			}
		} catch (error) {
			setActionError(getRecommendationsErrorMessage(error));
		} finally {
			if (isMountedRef.current) {
				setExitDirection(0);
				dragX.set(0);
			}
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
		} catch (error) {
			setActionError(getRecommendationsErrorMessage(error));
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

	return {
		actionError,
		currentRecommendation,
		dragX,
		dragXOpacity,
		dragXRotate,
		exitDirection,
		isLoading: isReloading && !currentRecommendation,
		isWorking,
		loadError: reloadError,
		onDecline: () => {
			handleFeedback("declined", -1).catch(() => {
				return undefined;
			});
		},
		onLike: () => {
			handleFeedback("accepted", 1).catch(() => {
				return undefined;
			});
		},
		onOpenDetails: () => {
			handleOpenDetails().catch(() => {
				return undefined;
			});
		},
		retry: async () => {
			await reloadRecommendations({
				reportError: true,
				sync: true,
			});
		},
		shouldReduceMotion,
		swipeThresholdPx: SWIPE_THRESHOLD_PX,
	};
}
