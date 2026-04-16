import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { getSafeRedirectPath } from "@/lib/auth";
import type { MediaType } from "@/lib/media";
import { getMediaReleaseDate, getMediaTitle } from "@/lib/media-adapters";
import {
	getGenreNames,
	getReleaseYear,
	getTmdbImageUrl,
	type Movie,
	type Show,
} from "@/lib/tmdb";

type MediaCardItem = Movie | Show;

export default function MediaCard({
	media,
	type,
}: {
	media: MediaCardItem;
	type: MediaType;
}) {
	const location = useLocation();
	const title = getMediaTitle(media);
	const releaseDate = getMediaReleaseDate(media);
	const returnToHref = getSafeRedirectPath(
		`${location.pathname}${location.searchStr}`
	);
	const posterUrl = getTmdbImageUrl(
		media.poster_path ?? media.backdrop_path,
		"w500"
	);

	return (
		<Link
			className="group cursor-pointer rounded-3xl bg-white p-4 transition-colors duration-150 ease-out hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
			params={{
				type,
				id: String(media.id),
			}}
			search={(currentSearch) => ({
				page: currentSearch.page ?? 1,
				q: currentSearch.q ?? "",
				view: currentSearch.view ?? "discover",
			})}
			state={(currentState) => ({
				...currentState,
				returnToHref,
			})}
			to="/$type/$id"
		>
			<div className="flex items-center justify-between">
				<h2 className="line-clamp-1 font-medium text-sm text-zinc-600 dark:text-zinc-300">
					{title}
				</h2>
				<p className="text-sm text-zinc-600 dark:text-zinc-300">
					{getReleaseYear(releaseDate)}
				</p>
			</div>
			<div className="relative mx-auto my-6 aspect-2/3 w-full max-w-48 overflow-hidden rounded-2xl bg-zinc-200 shadow-2xl dark:bg-zinc-800">
				{posterUrl ? (
					<img
						alt={title}
						className="pointer-events-none h-full w-full object-cover"
						height={750}
						loading="lazy"
						src={posterUrl}
						width={500}
					/>
				) : null}
			</div>
			<div className="flex items-center justify-between">
				<p className="max-w-[13.5ch] truncate text-sm text-zinc-600 dark:text-zinc-300">
					{getGenreNames(media.genre_ids.slice(0, 2)).join(" ∙ ")}
				</p>
				<span className="flex items-center gap-1 font-medium text-sm text-zinc-950 dark:text-zinc-50">
					Learn more
					<ArrowRight className="size-4" />
				</span>
			</div>
		</Link>
	);
}
