import {
	animate,
	motion,
	useMotionValue,
	useReducedMotion,
} from "motion/react";
import { Carousel, useCarousel } from "motion-plus/react";
import { useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import {
	getGenreNames,
	getReleaseYear,
	getTmdbImageUrl,
	type Movie,
} from "@/lib/tmdb";

const HERO_CAROUSEL_AUTOPLAY_DELAY_MS = 6000;
const HERO_CAROUSEL_SLIDE_COUNT = 6;

export function getHeroCarouselAutoplayState(
	totalPages: number,
	shouldReduceMotion: boolean
): "idle" | "complete" | "running" {
	if (totalPages === 0) {
		return "idle";
	}

	if (totalPages < 2 || shouldReduceMotion) {
		return "complete";
	}

	return "running";
}

function HeroSlide({ movie }: { movie: Movie | null }) {
	const backdropUrl = movie
		? (getTmdbImageUrl(movie.backdrop_path, "w1280") ??
			getTmdbImageUrl(movie.poster_path, "w500"))
		: null;

	return (
		<article className="relative m-1 flex min-h-112 flex-col overflow-hidden rounded-[28px] text-white sm:min-h-128">
			<div className="absolute inset-0 -z-10 overflow-hidden rounded-[28px] bg-zinc-200/50 dark:bg-zinc-800/50" />
			<div className="relative">
				<div className="absolute inset-0 overflow-hidden rounded-[28px]!">
					{backdropUrl ? (
						<img
							alt=""
							className="absolute inset-0 h-full w-full object-cover"
							height={1080}
							src={backdropUrl}
							width={1920}
						/>
					) : (
						<div className="absolute inset-0 bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-950" />
					)}
					<div className="absolute inset-0 bg-linear-to-t from-black via-black/58 to-black/18" />
				</div>

				<div className="relative flex h-full min-h-112 flex-col justify-between p-6 sm:min-h-128 sm:p-8">
					<div>
						<h2 className="max-w-[14ch] text-balance font-medium text-3xl tracking-tight sm:text-4xl">
							{movie
								? movie.title
								: "Track movies, shows, and where to watch them."}
						</h2>
					</div>

					<div>
						<p className="line-clamp-4 max-w-[34ch] text-pretty text-base text-white/76">
							{movie?.overview ||
								"Search movies and TV shows, save a watchlist, mark favourites and watched titles, and compare streaming, rental, and purchase options by country."}
						</p>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 px-8 py-4 lg:py-3">
				<div className="hidden min-w-0 lg:block">
					<p className="line-clamp-1 flex-wrap text-sm text-zinc-500 dark:text-zinc-400">
						{getGenreNames(movie?.genre_ids ?? []).join(" ∙ ")} ∙{" "}
						{movie?.release_date ? getReleaseYear(movie.release_date) : "N/A"}
					</p>
				</div>
			</div>
		</article>
	);
}

function HeroCarouselObserver({
	isAutoplayPaused,
	onActivePageChange,
	progress,
}: {
	isAutoplayPaused: boolean;
	onActivePageChange: (page: number) => void;
	progress: ReturnType<typeof useMotionValue<number>>;
}) {
	const { currentPage, nextPage, totalPages } = useCarousel();
	const shouldReduceMotion = useReducedMotion();
	const previousPageRef = useRef<number | null>(null);

	useEffect(() => {
		if (previousPageRef.current !== currentPage) {
			previousPageRef.current = currentPage;
			onActivePageChange(currentPage);
			progress.set(0);
		}

		const autoplayState = getHeroCarouselAutoplayState(
			totalPages,
			shouldReduceMotion ?? false
		);

		if (autoplayState === "idle") {
			progress.set(0);
			return;
		}

		if (autoplayState === "complete") {
			progress.set(1);
			return;
		}

		if (isAutoplayPaused) {
			return;
		}

		const remainingDurationSeconds =
			(HERO_CAROUSEL_AUTOPLAY_DELAY_MS * (1 - progress.get())) / 1000;
		const progressAnimation = animate(progress, 1, {
			duration: remainingDurationSeconds,
			ease: "linear",
			onComplete: nextPage,
		});

		return () => {
			progressAnimation.stop();
		};
	}, [
		currentPage,
		isAutoplayPaused,
		nextPage,
		onActivePageChange,
		progress,
		shouldReduceMotion,
		totalPages,
	]);

	return null;
}

function HeroCarouselIndicators({
	activePage,
	indicatorKeys,
	progress,
}: {
	activePage: number;
	indicatorKeys: readonly string[];
	progress: ReturnType<typeof useMotionValue<number>>;
}) {
	const { theme } = useTheme();
	const isDark = theme === "dark";
	const activeIndicatorTrackColor = isDark
		? "rgba(255, 255, 255, 0.32)"
		: "rgba(9, 9, 11, 0.14)";
	const inactiveIndicatorColor = isDark
		? "rgba(255, 255, 255, 0.42)"
		: "rgba(9, 9, 11, 0.32)";

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-6 sm:bottom-6 lg:static lg:z-auto lg:px-0"
		>
			<div className="flex items-center gap-2">
				{indicatorKeys.map((indicatorKey, index) => {
					const isActive = index === activePage;

					return (
						<motion.div
							animate={{
								backgroundColor: isActive
									? activeIndicatorTrackColor
									: inactiveIndicatorColor,
							}}
							className={`relative h-[3px] translate-y-px overflow-hidden rounded-full shadow-[0_0_8px_rgba(9,9,11,0.08)] dark:shadow-[0_0_10px_rgba(255,255,255,0.18)] ${
								isActive ? "w-8" : "w-3"
							}`}
							data-active={isActive}
							data-carousel-indicator=""
							key={indicatorKey}
							layout
							transition={{
								backgroundColor: {
									duration: 0.07,
									ease: "easeInOut",
								},
								layout: {
									duration: 0.22,
									ease: [0.645, 0.045, 0.355, 1],
								},
							}}
						>
							{isActive ? (
								<motion.div
									className="h-full w-full origin-left rounded-full bg-zinc-950 dark:bg-white"
									style={{ scaleX: progress, willChange: "transform" }}
								/>
							) : null}
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}

export default function HeroShowcase({ movies }: { movies: Movie[] }) {
	const carouselMovies: Array<Movie | null> =
		movies.length > 0 ? movies.slice(0, HERO_CAROUSEL_SLIDE_COUNT) : [null];
	const items = carouselMovies.map((movie, index) => (
		<HeroSlide key={movie?.id ?? `fallback-slide-${index}`} movie={movie} />
	)) ?? [null];
	const indicatorKeys = carouselMovies.map(
		(movie, index) =>
			movie?.id?.toString() ?? `hero-carousel-indicator-${index}`
	);
	const [activePage, setActivePage] = useState(0);
	const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
	const progress = useMotionValue(0);

	return (
		<div className="relative grid lg:gap-5">
			<div className="overflow-hidden rounded-4xl border border-zinc-200/80 bg-zinc-100 shadow-[0_32px_120px_rgba(24,24,27,0.14)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/88 dark:shadow-[0_32px_120px_rgba(0,0,0,0.4)]">
				<Carousel
					align="start"
					aria-label="Featured movies"
					as="div"
					className="w-full"
					fade={0}
					gap={0}
					itemSize="fill"
					items={items}
					loop={true}
					onMouseEnter={() => {
						setIsAutoplayPaused(true);
					}}
					onMouseLeave={() => {
						setIsAutoplayPaused(false);
					}}
					snap="page"
					transition={{
						damping: 40,
						stiffness: 220,
						type: "spring",
					}}
				>
					<HeroCarouselObserver
						isAutoplayPaused={isAutoplayPaused}
						onActivePageChange={setActivePage}
						progress={progress}
					/>
				</Carousel>
			</div>
			{carouselMovies.length > 1 ? (
				<HeroCarouselIndicators
					activePage={activePage}
					indicatorKeys={indicatorKeys}
					progress={progress}
				/>
			) : null}
		</div>
	);
}
