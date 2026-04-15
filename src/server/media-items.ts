import { and, eq } from "drizzle-orm";

import type { MediaType } from "@/lib/media";
import { mediaItem } from "@/schema";
import { db } from "@/server/db";

export interface TrackableMediaInput {
	backdropPath: string | null;
	genreIds: number[];
	mediaId: number;
	mediaType: MediaType;
	overview: string;
	posterPath: string | null;
	releaseDate: string;
	title: string;
}

export async function getExistingMediaItemId(input: {
	mediaId: number;
	mediaType: MediaType;
}): Promise<number | null> {
	const [entry] = await db
		.select({
			id: mediaItem.id,
		})
		.from(mediaItem)
		.where(
			and(
				eq(mediaItem.tmdbId, input.mediaId),
				eq(mediaItem.mediaType, input.mediaType)
			)
		)
		.limit(1);

	return entry?.id ?? null;
}

export async function upsertMediaItem(
	input: TrackableMediaInput
): Promise<number> {
	const now = new Date();
	const [savedItem] = await db
		.insert(mediaItem)
		.values({
			backdropPath: input.backdropPath,
			createdAt: now,
			genreIds: JSON.stringify(input.genreIds),
			mediaType: input.mediaType,
			overview: input.overview,
			posterPath: input.posterPath,
			releaseDate: input.releaseDate,
			title: input.title,
			tmdbId: input.mediaId,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			set: {
				backdropPath: input.backdropPath,
				genreIds: JSON.stringify(input.genreIds),
				overview: input.overview,
				posterPath: input.posterPath,
				releaseDate: input.releaseDate,
				title: input.title,
				updatedAt: now,
			},
			target: [mediaItem.mediaType, mediaItem.tmdbId],
		})
		.returning({
			id: mediaItem.id,
		});

	if (!savedItem) {
		throw new Error("Failed to save media item.");
	}

	return savedItem.id;
}

export function parseStoredGenreIds(rawGenreIds: string): number[] {
	try {
		const parsedGenreIds = JSON.parse(rawGenreIds) as unknown;

		if (Array.isArray(parsedGenreIds)) {
			return parsedGenreIds.filter(
				(genreId): genreId is number => typeof genreId === "number"
			);
		}
	} catch {
		return [];
	}

	return [];
}
