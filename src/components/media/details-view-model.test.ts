import { describe, expect, it } from "vitest";

import {
	buildMovieDetailsPageProps,
	buildShowDetailsPageProps,
} from "@/components/media/details-view-model";

const trackerState = {
	isFavorite: false,
	isInWatchlist: true,
	isWatched: false,
} as const;

describe("details view model", () => {
	it("builds movie details props", () => {
		const props = buildMovieDetailsPageProps({
			movie: {
				backdrop_path: "/movie-backdrop.jpg",
				genres: [
					{
						id: 28,
						name: "Action",
					},
				],
				homepage: null,
				id: 91,
				original_language: "en",
				overview: "Movie overview",
				popularity: 33,
				poster_path: "/movie-poster.jpg",
				release_date: "2024-02-14",
				runtime: 110,
				status: "Released",
				tagline: "Tagline",
				title: "Movie Details",
				vote_average: 7.1,
				vote_count: 400,
			},
			trackerState,
		});

		expect(props.aboutLabel).toBe("About the film");
		expect(props.title).toBe("Movie Details");
		expect(props.heroPills).toEqual(["2024", "110 min", "Released"]);
		expect(props.statCards[0]).toEqual({
			label: "Release Date",
			value: new Date("2024-02-14").toLocaleDateString(),
		});
		expect(props.trackerMedia.mediaType).toBe("movies");
	});

	it("builds show details props", () => {
		const props = buildShowDetailsPageProps({
			show: {
				backdrop_path: "/show-backdrop.jpg",
				episode_run_time: [45],
				first_air_date: "2022-10-05",
				genres: [
					{
						id: 18,
						name: "Drama",
					},
				],
				homepage: null,
				id: 18,
				name: "Show Details",
				number_of_episodes: 12,
				number_of_seasons: 2,
				original_language: "en",
				overview: "Show overview",
				popularity: 22,
				poster_path: "/show-poster.jpg",
				seasons: [],
				status: "Returning Series",
				tagline: "Tagline",
				vote_average: 8.4,
				vote_count: 250,
			},
			trackerState,
		});

		expect(props.aboutLabel).toBe("About the series");
		expect(props.title).toBe("Show Details");
		expect(props.heroPills).toEqual(["2022", "45 min", "Returning Series"]);
		expect(props.statCards[1]).toEqual({
			label: "Episode Runtime",
			value: "45 min",
		});
		expect(props.trackerMedia.mediaType).toBe("tv");
	});
});
