CREATE TABLE `media_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdbId` integer NOT NULL,
	`mediaType` text NOT NULL,
	`title` text NOT NULL,
	`releaseDate` text NOT NULL,
	`posterPath` text,
	`backdropPath` text,
	`genreIds` text NOT NULL,
	`overview` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_item_type_index` ON `media_item` (`mediaType`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_item_tmdb_type_unique` ON `media_item` (`mediaType`,`tmdbId`);--> statement-breakpoint
CREATE TABLE `user_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text NOT NULL,
	`mediaItemId` integer NOT NULL,
	`isInWatchlist` integer DEFAULT false NOT NULL,
	`isFavorite` integer DEFAULT false NOT NULL,
	`isWatched` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mediaItemId`) REFERENCES `media_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_media_user_id_index` ON `user_media` (`userId`);--> statement-breakpoint
CREATE INDEX `user_media_user_updated_index` ON `user_media` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_media_user_media_item_unique` ON `user_media` (`userId`,`mediaItemId`);