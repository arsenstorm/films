import { describe, expect, it } from "vitest";

import { getTmdbMediaPageUrl } from "@/lib/tmdb";

describe("getTmdbMediaPageUrl", () => {
	it("builds the TMDB movie page URL", () => {
		expect(getTmdbMediaPageUrl("movies", 550)).toBe(
			"https://www.themoviedb.org/movie/550"
		);
	});

	it("builds the TMDB TV page URL", () => {
		expect(getTmdbMediaPageUrl("tv", 1399)).toBe(
			"https://www.themoviedb.org/tv/1399"
		);
	});
});
