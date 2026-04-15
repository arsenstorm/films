CREATE TABLE `recommendation_impression` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text NOT NULL,
	`tmdbId` integer NOT NULL,
	`mediaType` text NOT NULL,
	`source` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recommendation_impression_user_id_index` ON `recommendation_impression` (`userId`);--> statement-breakpoint
CREATE INDEX `recommendation_impression_user_created_index` ON `recommendation_impression` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `recommendation_impression_user_media_index` ON `recommendation_impression` (`userId`,`mediaType`,`tmdbId`);