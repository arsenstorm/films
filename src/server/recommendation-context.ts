import { and, desc, eq, or } from "drizzle-orm";

import type { MediaType } from "@/lib/media";
import {
	mediaItem,
	recommendationFeedback,
	recommendationImpression,
	userMedia,
} from "@/schema";
import { requireAuthenticatedUserId } from "@/server/auth.server";
import { db } from "@/server/db";
import {
	buildRecommendationSeeds,
	buildRecommendationSignals,
	buildRecommendationTasteProfile,
	type RecommendationFeedbackRow,
	type RecommendationImpressionRow,
	type RecommendationSeed,
	type RecommendationTasteProfile,
	type TrackedRecommendationRow,
} from "@/server/recommendations-engine";

const MAX_RECOMMENDATION_IMPRESSIONS = 250;

interface RecommendationReviewHistoryRowResult {
	backdropPath: string | null;
	genreIds: string;
	isDisliked: boolean;
	isFavorite: boolean | null;
	isInWatchlist: boolean | null;
	isLiked: boolean;
	isWatched: boolean | null;
	mediaId: number;
	mediaType: MediaType;
	overview: string;
	posterPath: string | null;
	releaseDate: string;
	title: string;
	updatedAt: Date;
}

export interface RecommendationContext {
	feedbackRows: RecommendationFeedbackRow[];
	impressionRows: RecommendationImpressionRow[];
	isColdStart: boolean;
	profile: RecommendationTasteProfile;
	seeds: RecommendationSeed[];
	signalCount: number;
	trackedRows: TrackedRecommendationRow[];
}

export interface RecommendationReviewHistoryRow
	extends TrackedRecommendationRow {
	isDisliked: boolean;
	isLiked: boolean;
	isTracked: boolean;
}

function loadTrackedRecommendationRows(
	userId: string
): Promise<TrackedRecommendationRow[]> {
	return db
		.select({
			backdropPath: mediaItem.backdropPath,
			genreIds: mediaItem.genreIds,
			isFavorite: userMedia.isFavorite,
			isInWatchlist: userMedia.isInWatchlist,
			isWatched: userMedia.isWatched,
			mediaId: mediaItem.tmdbId,
			mediaType: mediaItem.mediaType,
			overview: mediaItem.overview,
			posterPath: mediaItem.posterPath,
			releaseDate: mediaItem.releaseDate,
			title: mediaItem.title,
			updatedAt: userMedia.updatedAt,
		})
		.from(userMedia)
		.innerJoin(mediaItem, eq(userMedia.mediaItemId, mediaItem.id))
		.where(
			and(
				eq(userMedia.userId, userId),
				or(
					eq(userMedia.isFavorite, true),
					eq(userMedia.isInWatchlist, true),
					eq(userMedia.isWatched, true)
				)
			)
		);
}

function loadRecommendationFeedbackRows(
	userId: string
): Promise<RecommendationFeedbackRow[]> {
	return db
		.select({
			genreIds: mediaItem.genreIds,
			isDisliked: recommendationFeedback.isDisliked,
			isLiked: recommendationFeedback.isLiked,
			mediaType: recommendationFeedback.mediaType,
			title: mediaItem.title,
			tmdbId: recommendationFeedback.tmdbId,
			updatedAt: recommendationFeedback.updatedAt,
		})
		.from(recommendationFeedback)
		.leftJoin(
			mediaItem,
			and(
				eq(recommendationFeedback.tmdbId, mediaItem.tmdbId),
				eq(recommendationFeedback.mediaType, mediaItem.mediaType)
			)
		)
		.where(eq(recommendationFeedback.userId, userId));
}

function loadRecommendationImpressionRows(
	userId: string
): Promise<RecommendationImpressionRow[]> {
	return db
		.select({
			createdAt: recommendationImpression.createdAt,
			mediaType: recommendationImpression.mediaType,
			source: recommendationImpression.source,
			tmdbId: recommendationImpression.tmdbId,
		})
		.from(recommendationImpression)
		.where(eq(recommendationImpression.userId, userId))
		.orderBy(desc(recommendationImpression.createdAt))
		.limit(MAX_RECOMMENDATION_IMPRESSIONS);
}

function normalizeRecommendationReviewHistoryRow(
	row: RecommendationReviewHistoryRowResult
): RecommendationReviewHistoryRow {
	const isFavorite = row.isFavorite ?? false;
	const isInWatchlist = row.isInWatchlist ?? false;
	const isWatched = row.isWatched ?? false;

	return {
		backdropPath: row.backdropPath,
		genreIds: row.genreIds,
		isDisliked: row.isDisliked,
		isFavorite,
		isInWatchlist,
		isLiked: row.isLiked,
		isTracked: isFavorite || isInWatchlist || isWatched,
		isWatched,
		mediaId: row.mediaId,
		mediaType: row.mediaType,
		overview: row.overview,
		posterPath: row.posterPath,
		releaseDate: row.releaseDate,
		title: row.title,
		updatedAt: row.updatedAt,
	};
}

export async function loadRecommendationReviewHistoryRows(
	userId: string
): Promise<RecommendationReviewHistoryRow[]> {
	const reviewRows = await db
		.select({
			backdropPath: mediaItem.backdropPath,
			genreIds: mediaItem.genreIds,
			isDisliked: recommendationFeedback.isDisliked,
			isFavorite: userMedia.isFavorite,
			isInWatchlist: userMedia.isInWatchlist,
			isLiked: recommendationFeedback.isLiked,
			isWatched: userMedia.isWatched,
			mediaId: mediaItem.tmdbId,
			mediaType: mediaItem.mediaType,
			overview: mediaItem.overview,
			posterPath: mediaItem.posterPath,
			releaseDate: mediaItem.releaseDate,
			title: mediaItem.title,
			updatedAt: recommendationFeedback.updatedAt,
		})
		.from(recommendationFeedback)
		.innerJoin(
			mediaItem,
			and(
				eq(recommendationFeedback.tmdbId, mediaItem.tmdbId),
				eq(recommendationFeedback.mediaType, mediaItem.mediaType)
			)
		)
		.leftJoin(
			userMedia,
			and(eq(userMedia.userId, userId), eq(userMedia.mediaItemId, mediaItem.id))
		)
		.where(eq(recommendationFeedback.userId, userId))
		.orderBy(desc(recommendationFeedback.updatedAt));

	return reviewRows.map(normalizeRecommendationReviewHistoryRow);
}

export async function loadRecommendationContext(
	userId: string
): Promise<RecommendationContext> {
	const [trackedRows, feedbackRows, impressionRows] = await Promise.all([
		loadTrackedRecommendationRows(userId),
		loadRecommendationFeedbackRows(userId),
		loadRecommendationImpressionRows(userId),
	]);
	const signals = buildRecommendationSignals(trackedRows, feedbackRows);
	const seeds = buildRecommendationSeeds({
		feedbackRows,
		trackedRows,
	});

	return {
		feedbackRows,
		impressionRows,
		isColdStart: signals.length === 0,
		profile: buildRecommendationTasteProfile(signals),
		seeds,
		signalCount: signals.length,
		trackedRows,
	};
}

export async function loadCurrentRecommendationContext(): Promise<RecommendationContext> {
	return loadRecommendationContext(await requireAuthenticatedUserId());
}
