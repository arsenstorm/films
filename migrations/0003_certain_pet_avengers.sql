CREATE TABLE `recommendation_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text NOT NULL,
	`tmdbId` integer NOT NULL,
	`mediaType` text NOT NULL,
	`isLiked` integer DEFAULT false NOT NULL,
	`isDisliked` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recommendation_feedback_user_id_index` ON `recommendation_feedback` (`userId`);--> statement-breakpoint
CREATE INDEX `recommendation_feedback_user_updated_index` ON `recommendation_feedback` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `recommendation_feedback_user_media_unique` ON `recommendation_feedback` (`userId`,`mediaType`,`tmdbId`);