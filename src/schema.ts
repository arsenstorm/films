import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable(
	"user",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull(),
		emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
		image: text("image"),
		special: integer("special", { mode: "boolean" }).notNull().default(false),
		createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [uniqueIndex("user_email_unique").on(table.email)]
);

export const session = sqliteTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
		token: text("token").notNull(),
		createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
		ipAddress: text("ipAddress"),
		userAgent: text("userAgent"),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		uniqueIndex("session_token_unique").on(table.token),
		index("session_user_id_index").on(table.userId),
	]
);

export const account = sqliteTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("accountId").notNull(),
		providerId: text("providerId").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("accessToken"),
		refreshToken: text("refreshToken"),
		idToken: text("idToken"),
		accessTokenExpiresAt: integer("accessTokenExpiresAt", {
			mode: "timestamp_ms",
		}),
		refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
			mode: "timestamp_ms",
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		index("account_user_id_index").on(table.userId),
		uniqueIndex("account_provider_account_unique").on(
			table.providerId,
			table.accountId
		),
	]
);

export const verification = sqliteTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [index("verification_identifier_index").on(table.identifier)]
);

export const mediaItem = sqliteTable(
	"media_item",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		tmdbId: integer("tmdbId").notNull(),
		mediaType: text("mediaType", { enum: ["movies", "tv"] }).notNull(),
		title: text("title").notNull(),
		releaseDate: text("releaseDate").notNull(),
		posterPath: text("posterPath"),
		backdropPath: text("backdropPath"),
		genreIds: text("genreIds").notNull(),
		overview: text("overview").notNull(),
		createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		index("media_item_type_index").on(table.mediaType),
		uniqueIndex("media_item_tmdb_type_unique").on(
			table.mediaType,
			table.tmdbId
		),
	]
);

export const userMedia = sqliteTable(
	"user_media",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		mediaItemId: integer("mediaItemId")
			.notNull()
			.references(() => mediaItem.id, { onDelete: "cascade" }),
		isInWatchlist: integer("isInWatchlist", { mode: "boolean" })
			.notNull()
			.default(false),
		isFavorite: integer("isFavorite", { mode: "boolean" })
			.notNull()
			.default(false),
		isWatched: integer("isWatched", { mode: "boolean" })
			.notNull()
			.default(false),
		createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		index("user_media_user_id_index").on(table.userId),
		index("user_media_user_updated_index").on(table.userId, table.updatedAt),
		uniqueIndex("user_media_user_media_item_unique").on(
			table.userId,
			table.mediaItemId
		),
	]
);

export const recommendationFeedback = sqliteTable(
	"recommendation_feedback",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		tmdbId: integer("tmdbId").notNull(),
		mediaType: text("mediaType", { enum: ["movies", "tv"] }).notNull(),
		isLiked: integer("isLiked", { mode: "boolean" }).notNull().default(false),
		isDisliked: integer("isDisliked", { mode: "boolean" })
			.notNull()
			.default(false),
		createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		index("recommendation_feedback_user_id_index").on(table.userId),
		index("recommendation_feedback_user_updated_index").on(
			table.userId,
			table.updatedAt
		),
		uniqueIndex("recommendation_feedback_user_media_unique").on(
			table.userId,
			table.mediaType,
			table.tmdbId
		),
	]
);

export const recommendationImpression = sqliteTable(
	"recommendation_impression",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		tmdbId: integer("tmdbId").notNull(),
		mediaType: text("mediaType", { enum: ["movies", "tv"] }).notNull(),
		source: text("source", {
			enum: ["discover", "related", "watchlist"],
		}).notNull(),
		position: integer("position").notNull().default(0),
		createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		index("recommendation_impression_user_id_index").on(table.userId),
		index("recommendation_impression_user_created_index").on(
			table.userId,
			table.createdAt
		),
		index("recommendation_impression_user_media_index").on(
			table.userId,
			table.mediaType,
			table.tmdbId
		),
	]
);

export const authSchema = {
	account,
	session,
	user,
	verification,
};

export const databaseSchema = {
	...authSchema,
	mediaItem,
	recommendationFeedback,
	recommendationImpression,
	userMedia,
};
