import { describe, expect, it } from "vitest";

import {
	getMediaReleaseDate,
	getMediaTitle,
	normalizeMovieBrowseMedia,
	normalizeShowBrowseMedia,
	toTrackableBrowseMediaInput,
	toTrackableMovieDetailsInput,
	toTrackableShowDetailsInput,
} from "@/lib/media-adapters";

describe("media adapters", () => {
	it("normalizes movies into browse media and trackable inputs", () => {
		const movie = {
			adult: false,
			backdrop_path: "/backdrop.jpg",
			genre_ids: [28, 12],
			id: 42,
			original_language: "en",
			original_title: "Original Film",
			overview: "A film overview.",
			popularity: 75,
			poster_path: "/poster.jpg",
			release_date: "2024-03-01",
			title: "Film Title",
			video: false,
			vote_average: 7.5,
			vote_count: 1200,
		};
		const browseMovie = normalizeMovieBrowseMedia(movie);

		expect(getMediaTitle(browseMovie)).toBe("Film Title");
		expect(getMediaReleaseDate(browseMovie)).toBe("2024-03-01");
		expect(browseMovie.mediaType).toBe("movies");
		expect(toTrackableBrowseMediaInput(browseMovie)).toEqual({
			backdropPath: "/backdrop.jpg",
			genreIds: [28, 12],
			mediaId: 42,
			mediaType: "movies",
			overview: "A film overview.",
			posterPath: "/poster.jpg",
			releaseDate: "2024-03-01",
			title: "Film Title",
		});
	});

	it("normalizes shows into browse media and trackable inputs", () => {
		const show = {
			adult: false,
			backdrop_path: "/backdrop.jpg",
			first_air_date: "2023-09-10",
			genre_ids: [18, 9648],
			id: 7,
			name: "Show Title",
			origin_country: ["US"],
			original_language: "en",
			original_name: "Original Show",
			overview: "A show overview.",
			popularity: 88,
			poster_path: "/poster.jpg",
			vote_average: 8.1,
			vote_count: 900,
		};
		const browseShow = normalizeShowBrowseMedia(show);

		expect(getMediaTitle(browseShow)).toBe("Show Title");
		expect(getMediaReleaseDate(browseShow)).toBe("2023-09-10");
		expect(browseShow.mediaType).toBe("tv");
		expect(toTrackableBrowseMediaInput(browseShow)).toEqual({
			backdropPath: "/backdrop.jpg",
			genreIds: [18, 9648],
			mediaId: 7,
			mediaType: "tv",
			overview: "A show overview.",
			posterPath: "/poster.jpg",
			releaseDate: "2023-09-10",
			title: "Show Title",
		});
	});

	it("maps detail responses into trackable inputs", () => {
		const movieDetails = {
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
			tagline: "",
			title: "Movie Details",
			vote_average: 7.1,
			vote_count: 400,
		};
		const showDetails = {
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
			status: "Returning Series",
			tagline: "",
			vote_average: 8.4,
			vote_count: 250,
		};

		expect(toTrackableMovieDetailsInput(movieDetails)).toEqual({
			backdropPath: "/movie-backdrop.jpg",
			genreIds: [28],
			mediaId: 91,
			mediaType: "movies",
			overview: "Movie overview",
			posterPath: "/movie-poster.jpg",
			releaseDate: "2024-02-14",
			title: "Movie Details",
		});
		expect(toTrackableShowDetailsInput(showDetails)).toEqual({
			backdropPath: "/show-backdrop.jpg",
			genreIds: [18],
			mediaId: 18,
			mediaType: "tv",
			overview: "Show overview",
			posterPath: "/show-poster.jpg",
			releaseDate: "2022-10-05",
			title: "Show Details",
		});
	});
});
