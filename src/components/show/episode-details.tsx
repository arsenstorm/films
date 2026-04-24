import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { ArrowDown, ArrowLeft, ArrowUpRight } from "lucide-react";

import WatchProvidersPanel from "@/components/media/watch-providers-panel";
import { getBrowseHref } from "@/lib/media";
import {
	type EpisodeDetails,
	getReleaseYear,
	getTmdbImageUrl,
	type SeasonDetails,
	type ShowDetails,
} from "@/lib/tmdb";

const frostedSurfaceClassName =
	"shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_28px_80px_rgba(0,0,0,0.22)] [-webkit-backdrop-filter:blur(22px)] [backdrop-filter:blur(22px)]";

const SHOW_DETAILS_ROUTE = "/$type/$id" as const;

export default function EpisodeDetailsPage({
	episode,
	season,
	show,
}: {
	episode: EpisodeDetails;
	season: SeasonDetails;
	show: ShowDetails;
}) {
	const location = useLocation();
	const stillUrl = getTmdbImageUrl(
		episode.still_path ?? season.poster_path ?? show.backdrop_path,
		"w1280"
	);
	const posterUrl = getTmdbImageUrl(
		episode.still_path ?? season.poster_path ?? show.poster_path,
		"w500"
	);

	function handleLearnMore(): void {
		const baseHref = getBrowseHref(`/tv/${show.id}/watch`, {
			page: "page" in location.search ? (location.search.page ?? 1) : 1,
			q: "q" in location.search ? (location.search.q ?? "") : "",
			view:
				"view" in location.search
					? (location.search.view ?? "discover")
					: "discover",
		});

		const url = new URL(baseHref, window.location.origin);
		url.searchParams.set("season", String(episode.season_number));
		url.searchParams.set("episode", String(episode.episode_number));

		window.open(`${url.pathname}${url.search}`, "_blank", "noopener");
	}

	function handleScrollToWatchProviders(): void {
		document.getElementById("watch-providers")?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}

	return (
		<main className="relative isolate min-h-screen bg-black text-white">
			<section className="relative isolate min-h-screen overflow-hidden">
				<div className="absolute inset-0 bg-black">
					{stillUrl ? (
						<img
							alt=""
							className="h-full w-full select-none object-cover opacity-70"
							height={720}
							src={stillUrl}
							width={1280}
						/>
					) : null}
					<div className="absolute inset-0 bg-linear-to-t from-black via-black/70 to-black/30" />
				</div>

				<div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-12 sm:px-8 lg:px-10">
					<div className="mt-auto grid items-end gap-8 pb-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-12">
						<div className="space-y-6">
							<div className="max-w-3xl space-y-3">
								<p className="font-medium text-base text-white/70">
									<Link
										className="inline-flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
										params={{
											id: String(show.id),
											type: "tv",
										}}
										search={(prev) => ({
											...prev,
											episode: undefined,
											season:
												episode.season_number === 1
													? undefined
													: episode.season_number,
										})}
										to={SHOW_DETAILS_ROUTE}
									>
										<ArrowLeft className="size-3.5" />
										{show.name}
									</Link>
									{show.first_air_date
										? ` · ${getReleaseYear(show.first_air_date)}`
										: ""}
								</p>
								<h1 className="max-w-3xl text-balance font-medium text-4xl text-white tracking-tight sm:text-5xl lg:text-6xl">
									{episode.name}
								</h1>
							</div>

							<div className="max-w-3xl">
								<p className="text-pretty text-base text-white/78 leading-7 sm:text-lg">
									{episode.overview ||
										"No overview available for this episode yet."}
								</p>
							</div>

							<div className="flex flex-wrap items-center gap-3 pt-2">
								<button
									className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-[#130f12] shadow-[0_14px_32px_rgba(255,255,255,0.12)] transition-colors duration-150 hover:bg-white/90"
									onClick={handleLearnMore}
									type="button"
								>
									Learn more
									<ArrowUpRight className="size-5" />
								</button>
								<button
									className={clsx(
										"inline-flex min-h-12 items-center gap-2 rounded-full bg-white/8 px-5 py-3 font-medium text-white transition-colors hover:bg-white/20",
										frostedSurfaceClassName
									)}
									onClick={handleScrollToWatchProviders}
									type="button"
								>
									Where to watch
									<ArrowDown className="size-5" />
								</button>
							</div>
						</div>

						<div className="flex justify-center lg:justify-end">
							<div className="w-auto">
								<div className="relative overflow-hidden rounded-4xl bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_28px_80px_rgba(0,0,0,0.28)]">
									{posterUrl ? (
										<img
											alt=""
											className="pointer-events-none aspect-video max-h-108 w-auto max-w-92 select-none object-cover"
											height={563}
											src={posterUrl}
											width={1000}
										/>
									) : (
										<div className="aspect-video w-92 bg-white/10" />
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{episode.guest_stars && episode.guest_stars.length > 0 ? (
				<section className="relative bg-black pt-6 pb-16 text-white">
					<div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
						<h2 className="font-medium text-2xl text-white tracking-tight">
							Guest stars
						</h2>
						<ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{episode.guest_stars.slice(0, 9).map((person) => (
								<li
									className={clsx(
										"flex items-center gap-3 rounded-2xl bg-white/8 p-3",
										frostedSurfaceClassName
									)}
									key={person.id}
								>
									<div className="size-12 shrink-0 overflow-hidden rounded-full bg-white/10 outline-1 outline-white/10 -outline-offset-1">
										{person.profile_path ? (
											<img
												alt=""
												className="h-full w-full object-cover"
												height={48}
												src={
													getTmdbImageUrl(person.profile_path, "w92") ??
													undefined
												}
												width={48}
											/>
										) : null}
									</div>
									<div className="min-w-0">
										<p className="truncate font-medium text-sm text-white">
											{person.name}
										</p>
										<p className="truncate text-white/60 text-xs">
											{person.character}
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</section>
			) : null}

			<section
				className="relative scroll-mt-6 bg-black pt-2 pb-16 text-white"
				id="watch-providers"
			>
				<div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
					<WatchProvidersPanel
						episodeNumber={episode.episode_number}
						id={show.id}
						seasonNumber={episode.season_number}
						type="tv"
					/>
				</div>
			</section>
		</main>
	);
}
