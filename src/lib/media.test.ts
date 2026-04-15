import { describe, expect, it } from "vitest";

import {
	getBrowseHref,
	getMediaRouteViewTransitionTypes,
	getMediaViewTransitionName,
	parseBrowseMediaType,
	parseBrowseSearch,
	parseMediaType,
} from "@/lib/media";

describe("parseBrowseSearch", () => {
	it("defaults to an empty query and first page", () => {
		expect(parseBrowseSearch({})).toEqual({
			page: 1,
			q: "",
			view: "discover",
		});
	});

	it("accepts a positive page value", () => {
		expect(
			parseBrowseSearch({
				page: "3",
				q: "alien",
				view: "watchlist",
			})
		).toEqual({
			page: 3,
			q: "alien",
			view: "watchlist",
		});
	});

	it("falls back to safe defaults for invalid values", () => {
		expect(
			parseBrowseSearch({
				page: "0",
				q: "heat",
				view: "queue",
			})
		).toEqual({
			page: 1,
			q: "heat",
			view: "discover",
		});
	});
});

describe("parseMediaType", () => {
	it("accepts supported media types", () => {
		expect(parseMediaType("movies")).toBe("movies");
		expect(parseMediaType("tv")).toBe("tv");
	});

	it("rejects unsupported media types", () => {
		expect(() => {
			parseMediaType("anime");
		}).toThrowError("Invalid media type.");
	});
});

describe("parseBrowseMediaType", () => {
	it("accepts supported browse media types", () => {
		expect(parseBrowseMediaType("all")).toBe("all");
		expect(parseBrowseMediaType("movies")).toBe("movies");
		expect(parseBrowseMediaType("tv")).toBe("tv");
	});

	it("rejects unsupported browse media types", () => {
		expect(() => {
			parseBrowseMediaType("anime");
		}).toThrowError("Invalid browse media type.");
	});
});

describe("getBrowseHref", () => {
	it("builds a clean browse URL for the default state", () => {
		expect(
			getBrowseHref("/movies", {
				page: 1,
				q: "",
				view: "discover",
			})
		).toBe("/movies");
	});

	it("includes the current query and page when needed", () => {
		expect(
			getBrowseHref("/tv", {
				page: 4,
				q: "severance",
				view: "favorites",
			})
		).toBe("/tv?q=severance&page=4&view=favorites");
	});
});

describe("getMediaViewTransitionName", () => {
	it("builds a stable transition name for shared elements", () => {
		expect(getMediaViewTransitionName("movies", 42, "content")).toBe(
			"media-movies-42-content"
		);
		expect(getMediaViewTransitionName("tv", "7", "title")).toBe(
			"media-tv-7-title"
		);
	});
});

describe("getMediaRouteViewTransitionTypes", () => {
	it("returns the detail entry type when opening a title from browse", () => {
		expect(getMediaRouteViewTransitionTypes("/movies", "/movies/42")).toEqual([
			"media-detail-enter",
		]);
		expect(getMediaRouteViewTransitionTypes("/all", "/movies/42")).toEqual([
			"media-detail-enter",
		]);
	});

	it("returns the detail exit type when going back to browse", () => {
		expect(getMediaRouteViewTransitionTypes("/tv/7", "/tv")).toEqual([
			"media-detail-exit",
		]);
		expect(getMediaRouteViewTransitionTypes("/tv/7", "/all")).toEqual([
			"media-detail-exit",
		]);
	});

	it("returns false for unrelated navigations", () => {
		expect(getMediaRouteViewTransitionTypes("/movies", "/tv")).toBe(false);
		expect(getMediaRouteViewTransitionTypes("/", "/movies/42")).toBe(false);
	});
});
