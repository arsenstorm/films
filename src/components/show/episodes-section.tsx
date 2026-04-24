import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import type { SeasonDetails, ShowDetails } from "@/lib/tmdb";
import { getTmdbImageUrl } from "@/lib/tmdb";

const frostedSurfaceClassName =
	"shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_28px_80px_rgba(0,0,0,0.22)] [-webkit-backdrop-filter:blur(22px)] [backdrop-filter:blur(22px)]";

function formatAirDate(date: string | null | undefined): string {
	if (!date) {
		return "TBA";
	}

	const parsed = new Date(date);

	return Number.isNaN(parsed.valueOf()) ? "TBA" : parsed.toLocaleDateString();
}

export default function EpisodesSection({
	season,
	show,
}: {
	season: SeasonDetails | null;
	show: ShowDetails;
}) {
	const visibleSeasons = show.seasons.filter(
		(item) => item.season_number > 0 && item.episode_count > 0
	);

	if (visibleSeasons.length === 0) {
		return null;
	}

	const activeSeasonNumber =
		season?.season_number ?? visibleSeasons[0]?.season_number ?? 1;

	return (
		<section
			className="relative scroll-mt-6 bg-black pt-4 pb-20 text-white"
			id="episodes"
		>
			<div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
				<div className="flex flex-wrap items-end justify-between gap-4 pb-6">
					<div>
						<p className="font-semibold text-[0.7rem] text-white/60 uppercase tracking-wider">
							Episodes
						</p>
						<h2 className="mt-1 font-medium text-3xl text-white tracking-tight sm:text-4xl">
							{season?.name ?? `Season ${activeSeasonNumber}`}
						</h2>
					</div>
					{season ? (
						<p className="text-sm text-white/60 tabular-nums">
							{season.episodes.length} episodes
						</p>
					) : null}
				</div>

				<ul className="-mx-5 mb-8 flex gap-2 overflow-x-auto px-5 pb-2 sm:-mx-0 sm:px-0">
					{visibleSeasons.map((item) => {
						const isActive = item.season_number === activeSeasonNumber;

						return (
							<li className="shrink-0" key={item.id}>
								<Link
									className={clsx(
										"inline-flex items-center rounded-full px-4 py-1.5 font-medium text-sm tabular-nums transition-colors",
										isActive
											? "bg-white text-[#130f12]"
											: clsx(
													"bg-white/8 text-white/80 hover:bg-white/16",
													frostedSurfaceClassName
												)
									)}
									params={{
										id: String(show.id),
										type: "tv",
									}}
									resetScroll={false}
									search={(prev) => ({
										...prev,
										episode: undefined,
										season:
											item.season_number === 1 ? undefined : item.season_number,
									})}
									to="/$type/$id"
								>
									Season {item.season_number}
								</Link>
							</li>
						);
					})}
				</ul>

				{season ? (
					<ul className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{season.episodes.map((episode) => {
							const stillUrl = getTmdbImageUrl(episode.still_path, "w300");

							return (
								<li key={episode.id}>
									<Link
										className={clsx(
											"group block overflow-hidden rounded-3xl bg-white/8 text-left transition-colors hover:bg-white/14",
											frostedSurfaceClassName
										)}
										params={{
											id: String(show.id),
											type: "tv",
										}}
										search={(prev) => ({
											...prev,
											episode: episode.episode_number,
											season: episode.season_number,
										})}
										to="/$type/$id"
									>
										<div className="relative aspect-video w-full overflow-hidden bg-white/6">
											{stillUrl ? (
												<img
													alt=""
													className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
													height={169}
													src={stillUrl}
													width={300}
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center text-sm text-white/30">
													No preview
												</div>
											)}
											<div className="absolute top-3 left-3 inline-flex items-center rounded-full bg-black/60 px-2.5 py-1 font-semibold text-[0.7rem] text-white tabular-nums tracking-wider">
												E{episode.episode_number}
											</div>
										</div>
										<div className="space-y-2 p-4">
											<div className="flex items-baseline justify-between gap-3">
												<h3 className="text-pretty font-medium text-base text-white">
													{episode.name}
												</h3>
												<span className="shrink-0 text-white/50 text-xs tabular-nums">
													{formatAirDate(episode.air_date)}
												</span>
											</div>
											{episode.overview ? (
												<p className="line-clamp-3 text-sm text-white/68 leading-6">
													{episode.overview}
												</p>
											) : null}
										</div>
									</Link>
								</li>
							);
						})}
					</ul>
				) : (
					<p className="text-sm text-white/60">
						Episodes for this season are unavailable.
					</p>
				)}
			</div>
		</section>
	);
}
