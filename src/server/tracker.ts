import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { parseStoredGenreIds } from "@/lib/genre-ids";
import type { BrowseMediaType, BrowseView, MediaType } from "@/lib/media";
import type {
	BrowseMediaResponse,
	Movie,
	MovieResponse,
	Show,
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

interface TrackedMediaRow {
	backdropPath: string | null;
	genreIds: string;
	mediaId: number;
	mediaType: MediaType;
	overview: string;
	posterPath: string | null;
	releaseDate: string;
	title: string;
}

type TrackedCollection = Exclude<BrowseView, "discover">;

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

function mapTrackedMovie(row: TrackedMediaRow): Movie {
	return {
		adult: false,
		backdrop_path: row.backdropPath,
		genre_ids: parseStoredGenreIds(row.genreIds),
		id: row.mediaId,
		original_language: "en",
		original_title: row.title,
		overview: row.overview,
		popularity: 0,
		poster_path: row.posterPath,
		release_date: row.releaseDate,
		title: row.title,
		video: false,
		vote_average: 0,
		vote_count: 0,
	};
}

function mapTrackedShow(row: TrackedMediaRow): Show {
	return {
		adult: false,
		backdrop_path: row.backdropPath,
		first_air_date: row.releaseDate,
		genre_ids: parseStoredGenreIds(row.genreIds),
		id: row.mediaId,
		name: row.title,
		origin_country: [],
		original_language: "en",
		original_name: row.title,
		overview: row.overview,
		popularity: 0,
		poster_path: row.posterPath,
		vote_average: 0,
		vote_count: 0,
	};
}

function mapTrackedBrowseMedia(
	row: TrackedMediaRow
): BrowseMediaResponse["results"][number] {
	if (row.mediaType === "movies") {
		return {
			...mapTrackedMovie(row),
			mediaType: "movies",
		};
	}

	return {
		...mapTrackedShow(row),
		mediaType: "tv",
	};
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

async function getTrackedMedia(input: {
	page: number;
	query: string;
	type: BrowseMediaType;
	view: TrackedCollection;
}): Promise<MovieResponse | ShowResponse | BrowseMediaResponse> {
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

export const getTrackedMediaFn = createServerFn({ method: "GET" })
	.inputValidator(
		(data: {
			page: number;
			query: string;
			type: BrowseMediaType;
			view: TrackedCollection;
		}) => data
	)
	.handler(async ({ data }) => getTrackedMedia(data));

export type { TrackableMediaInput } from "@/server/media-items";
