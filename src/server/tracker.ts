import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import type { BrowseView, MediaType } from "@/lib/media";
import type {
	BrowseMediaResponse,
	MovieResponse,
	ShowResponse,
} from "@/lib/tmdb";
import { mediaItem, userMedia } from "@/schema";
import { requireAuthenticatedUserId } from "@/server/auth.server";
import { db } from "@/server/db";
import {
	getExistingMediaItemId,
	type TrackableMediaInput,
	upsertMediaItem,
} from "@/server/media-items";
import {
	mapTrackedBrowseMedia,
	mapTrackedMovie,
	mapTrackedShow,
} from "@/server/tracked-browse-media";

const TRACKED_PAGE_SIZE = 20;

export interface MediaTrackerState {
	isFavorite: boolean;
	isInWatchlist: boolean;
	isWatched: boolean;
}

interface UpdateMediaTrackerStateInput {
	media: TrackableMediaInput;
	state: MediaTrackerState;
}

type TrackedCollection = Exclude<BrowseView, "discover">;
type TrackedMediaRequest =
	| {
			page: number;
			query: string;
			type: "all";
			view: TrackedCollection;
	  }
	| {
			page: number;
			query: string;
			type: "movies";
			view: TrackedCollection;
	  }
	| {
			page: number;
			query: string;
			type: "tv";
			view: TrackedCollection;
	  };

function getTrackedCollectionColumn(
	collection: TrackedCollection
): AnySQLiteColumn {
	switch (collection) {
		case "watchlist":
			return userMedia.isInWatchlist;
		case "favorites":
			return userMedia.isFavorite;
		case "watched":
			return userMedia.isWatched;
		default:
			return userMedia.isInWatchlist;
	}
}

function getEmptyTrackerState(): MediaTrackerState {
	return {
		isFavorite: false,
		isInWatchlist: false,
		isWatched: false,
	};
}

function requireTrackerUserId(): Promise<string> {
	return requireAuthenticatedUserId();
}

async function getMediaTrackerState(input: {
	mediaId: number;
	mediaType: MediaType;
}): Promise<MediaTrackerState> {
	const userId = await requireTrackerUserId();
	const [entry] = await db
		.select({
			isFavorite: userMedia.isFavorite,
			isInWatchlist: userMedia.isInWatchlist,
			isWatched: userMedia.isWatched,
		})
		.from(userMedia)
		.innerJoin(mediaItem, eq(userMedia.mediaItemId, mediaItem.id))
		.where(
			and(
				eq(userMedia.userId, userId),
				eq(mediaItem.tmdbId, input.mediaId),
				eq(mediaItem.mediaType, input.mediaType)
			)
		)
		.limit(1);

	return entry ?? getEmptyTrackerState();
}

async function updateMediaTrackerState(
	input: UpdateMediaTrackerStateInput
): Promise<MediaTrackerState> {
	const userId = await requireTrackerUserId();
	const nextState = input.state;
	const existingMediaItemId = await getExistingMediaItemId(input.media);

	if (
		!(nextState.isFavorite || nextState.isInWatchlist || nextState.isWatched)
	) {
		if (existingMediaItemId === null) {
			return nextState;
		}

		await db
			.delete(userMedia)
			.where(
				and(
					eq(userMedia.userId, userId),
					eq(userMedia.mediaItemId, existingMediaItemId)
				)
			);

		return nextState;
	}

	const mediaItemId =
		existingMediaItemId ?? (await upsertMediaItem(input.media));
	const now = new Date();

	if (existingMediaItemId !== null) {
		await upsertMediaItem(input.media);
	}

	await db
		.insert(userMedia)
		.values({
			createdAt: now,
			isFavorite: nextState.isFavorite,
			isInWatchlist: nextState.isInWatchlist,
			isWatched: nextState.isWatched,
			mediaItemId,
			updatedAt: now,
			userId,
		})
		.onConflictDoUpdate({
			set: {
				isFavorite: nextState.isFavorite,
				isInWatchlist: nextState.isInWatchlist,
				isWatched: nextState.isWatched,
				updatedAt: now,
			},
			target: [userMedia.userId, userMedia.mediaItemId],
		});

	return nextState;
}

async function getTrackedMediaImpl(
	input: TrackedMediaRequest
): Promise<MovieResponse | ShowResponse | BrowseMediaResponse> {
	const userId = await requireTrackerUserId();
	const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 1;
	const trimmedQuery = input.query.trim().toLowerCase();
	const collectionColumn = getTrackedCollectionColumn(input.view);
	const whereClause = and(
		eq(userMedia.userId, userId),
		input.type === "all" ? undefined : eq(mediaItem.mediaType, input.type),
		eq(collectionColumn, true),
		trimmedQuery
			? sql`lower(${mediaItem.title}) like ${`%${trimmedQuery}%`}`
			: undefined
	);
	const [countResult] = await db
		.select({
			count: sql<number>`count(*)`,
		})
		.from(userMedia)
		.innerJoin(mediaItem, eq(userMedia.mediaItemId, mediaItem.id))
		.where(whereClause);
	const rows = await db
		.select({
			backdropPath: mediaItem.backdropPath,
			genreIds: mediaItem.genreIds,
			mediaId: mediaItem.tmdbId,
			mediaType: mediaItem.mediaType,
			overview: mediaItem.overview,
			posterPath: mediaItem.posterPath,
			releaseDate: mediaItem.releaseDate,
			title: mediaItem.title,
		})
		.from(userMedia)
		.innerJoin(mediaItem, eq(userMedia.mediaItemId, mediaItem.id))
		.where(whereClause)
		.orderBy(desc(userMedia.updatedAt))
		.limit(TRACKED_PAGE_SIZE)
		.offset((page - 1) * TRACKED_PAGE_SIZE);
	const totalResults = countResult?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalResults / TRACKED_PAGE_SIZE));

	if (input.type === "all") {
		return {
			page,
			results: rows.map(mapTrackedBrowseMedia),
			total_pages: totalPages,
			total_results: totalResults,
		};
	}

	if (input.type === "movies") {
		return {
			page,
			results: rows.map(mapTrackedMovie),
			total_pages: totalPages,
			total_results: totalResults,
		};
	}

	return {
		page,
		results: rows.map(mapTrackedShow),
		total_pages: totalPages,
		total_results: totalResults,
	};
}

export const getMediaTrackerStateFn = createServerFn({ method: "GET" })
	.inputValidator((data: { mediaId: number; mediaType: MediaType }) => data)
	.handler(async ({ data }) => getMediaTrackerState(data));

export const updateMediaTrackerStateFn = createServerFn({ method: "POST" })
	.inputValidator((data: UpdateMediaTrackerStateInput) => data)
	.handler(async ({ data }) => updateMediaTrackerState(data));

const getTrackedMediaServerFn = createServerFn({ method: "GET" })
	.inputValidator((data: TrackedMediaRequest) => data)
	.handler(async ({ data }) => getTrackedMediaImpl(data));

export function getTrackedMediaFn(input: {
	data: Extract<TrackedMediaRequest, { type: "all" }>;
}): Promise<BrowseMediaResponse>;
export function getTrackedMediaFn(input: {
	data: Extract<TrackedMediaRequest, { type: "movies" }>;
}): Promise<MovieResponse>;
export function getTrackedMediaFn(input: {
	data: Extract<TrackedMediaRequest, { type: "tv" }>;
}): Promise<ShowResponse>;
export function getTrackedMediaFn(input: {
	data: TrackedMediaRequest;
}): Promise<MovieResponse | ShowResponse | BrowseMediaResponse> {
	return getTrackedMediaServerFn(input) as Promise<
		MovieResponse | ShowResponse | BrowseMediaResponse
	>;
}

export type { TrackableMediaInput } from "@/server/media-items";
