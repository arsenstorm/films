import { createServerFn } from "@tanstack/react-start";

import type { MediaType } from "@/lib/media";
import { recommendationFeedback, recommendationImpression } from "@/schema";
import { requireAuthenticatedUserId } from "@/server/auth.server";
import { db } from "@/server/db";
import {
	type TrackableMediaInput,
	upsertMediaItem,
} from "@/server/media-items";
import {
	loadCurrentRecommendationContext,
	loadRecommendationContext,
	loadRecommendationReviewHistoryRows,
	type RecommendationContext,
} from "@/server/recommendation-context";
import {
	buildRecommendationReviewResult,
	type RecommendationReviewResult,
} from "@/server/recommendation-review";
import {
	buildRecommendationCandidates,
	rerankRecommendationCandidates,
} from "@/server/recommendation-sources";
import {
	buildRecommendationBatch,
	buildRecommendationHistoryDiagnostics,
	type RecommendationBatchResult,
	type RecommendationHistoryDiagnostics,
	type RecommendationResult,
} from "@/server/recommendations-engine";

const RECOMMENDATION_REVIEW_BATCH_SIZE = 18;

export type RecommendationFeedbackAction = "accepted" | "declined";

async function getRecommendationBatch(input?: {
	batchSize?: number;
	context?: RecommendationContext;
}): Promise<RecommendationBatchResult | null> {
	const context = input?.context ?? (await loadCurrentRecommendationContext());
	const candidates = await buildRecommendationCandidates(context);
	const rerankedCandidates = await rerankRecommendationCandidates({
		candidates,
		context,
	});
	const batch = buildRecommendationBatch({
		batchSize: input?.batchSize,
		candidates: rerankedCandidates,
		impressionRows: context.impressionRows,
		isColdStart: context.isColdStart,
		profile: context.profile,
		seedCount: context.seeds.length,
		signalCount: context.signalCount,
	});

	return batch.recommendations.length > 0 ? batch : null;
}

async function getRecommendationReview(): Promise<RecommendationReviewResult> {
	const userId = await requireAuthenticatedUserId();
	const [context, reviewRows] = await Promise.all([
		loadRecommendationContext(userId),
		loadRecommendationReviewHistoryRows(userId),
	]);
	const newRecommendations =
		(
			await getRecommendationBatch({
				batchSize: RECOMMENDATION_REVIEW_BATCH_SIZE,
				context,
			})
		)?.recommendations ?? [];

	return buildRecommendationReviewResult({
		newRecommendations,
		reviewRows,
	});
}

async function getRecommendationDiagnostics(): Promise<RecommendationHistoryDiagnostics> {
	const context = await loadCurrentRecommendationContext();

	return buildRecommendationHistoryDiagnostics({
		feedbackRows: context.feedbackRows,
		impressionRows: context.impressionRows,
		profile: context.profile,
		seedCount: context.seeds.length,
		signalCount: context.signalCount,
	});
}

async function recordRecommendationFeedback(input: {
	action: RecommendationFeedbackAction;
	media: TrackableMediaInput;
}): Promise<void> {
	const userId = await requireAuthenticatedUserId();
	const now = new Date();

	await upsertMediaItem(input.media);

	await db
		.insert(recommendationFeedback)
		.values({
			createdAt: now,
			isDisliked: input.action === "declined",
			isLiked: input.action === "accepted",
			mediaType: input.media.mediaType,
			tmdbId: input.media.mediaId,
			updatedAt: now,
			userId,
		})
		.onConflictDoUpdate({
			set: {
				isDisliked: input.action === "declined",
				isLiked: input.action === "accepted",
				updatedAt: now,
			},
			target: [
				recommendationFeedback.userId,
				recommendationFeedback.mediaType,
				recommendationFeedback.tmdbId,
			],
		});
}

async function recordRecommendationImpression(input: {
	mediaId: number;
	mediaType: MediaType;
	position: number;
	source: RecommendationResult["source"];
}): Promise<void> {
	const userId = await requireAuthenticatedUserId();

	await db.insert(recommendationImpression).values({
		createdAt: new Date(),
		mediaType: input.mediaType,
		position: Math.max(0, input.position),
		source: input.source,
		tmdbId: input.mediaId,
		userId,
	});
}

export const getRecommendationFn = createServerFn({ method: "GET" }).handler(
	async () => getRecommendationBatch()
);

export const getRecommendationReviewFn = createServerFn({
	method: "GET",
}).handler(async () => getRecommendationReview());

export const recordRecommendationFeedbackFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			action: RecommendationFeedbackAction;
			media: TrackableMediaInput;
		}) => data
	)
	.handler(async ({ data }) => recordRecommendationFeedback(data));

export const recordRecommendationImpressionFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		(data: {
			mediaId: number;
			mediaType: MediaType;
			position: number;
			source: RecommendationResult["source"];
		}) => data
	)
	.handler(async ({ data }) => recordRecommendationImpression(data));

export const getRecommendationDiagnosticsFn = createServerFn({
	method: "GET",
}).handler(async () => getRecommendationDiagnostics());

export type { RecommendationReviewResult } from "@/server/recommendation-review";
export type {
	RecommendationBatchResult,
	RecommendationHistoryDiagnostics,
	RecommendationResult,
} from "@/server/recommendations-engine";
