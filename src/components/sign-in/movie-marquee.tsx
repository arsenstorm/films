import { useMemo } from "react";

import { getGenreNames, getTmdbImageUrl, type Movie } from "@/lib/tmdb";

interface MovieMarqueeProps {
	movies: Movie[];
}

interface PickedMovie {
	key: string;
	movie: Movie;
	sourceIndex: number;
}

const CARD_SIZE = 256;
const ROW_PITCH = CARD_SIZE + 12;
const MOVIES_PER_ROW = 8;

const ROW_CONFIG = [
	{
		duration: 48,
		offset: -ROW_PITCH,
		visibilityClass: "hidden lg:block",
	},
	{
		duration: 42,
		offset: 0,
		visibilityClass: "block",
	},
	{
		duration: 46,
		offset: ROW_PITCH,
		visibilityClass: "hidden xl:block",
	},
] as const;

function pickMovies(
	movies: Movie[],
	startIndex: number,
	count: number
): PickedMovie[] {
	if (movies.length === 0) {
		return [];
	}

	return Array.from({ length: Math.min(count, movies.length) }, (_, index) => {
		const sourceIndex = (startIndex + index) % movies.length;
		const movie = movies[sourceIndex];

		return {
			key: `${movie.id}-${sourceIndex}`,
			movie,
			sourceIndex,
		};
	});
}

function getDeterministicRandom(seed: number): number {
	const value = Math.sin(seed) * 10_000;

	return value - Math.floor(value);
}

function getCardAnimationStyle(
	movieId: number,
	rowIndex: number,
	itemIndex: number,
	cloneIndex: number
): React.CSSProperties {
	const baseSeed =
		movieId * 31 + rowIndex * 101 + itemIndex * 53 + cloneIndex * 211;
	const normalizedColumn =
		MOVIES_PER_ROW > 1 ? itemIndex / (MOVIES_PER_ROW - 1) : 0;
	const normalizedRow =
		ROW_CONFIG.length > 1 ? rowIndex / (ROW_CONFIG.length - 1) : 0;
	const randomWeight = getDeterministicRandom(baseSeed);
	const weightedOrder = normalizedColumn * 0.4 + randomWeight * 0.6;
	const delay =
		0.08 + weightedOrder * 1.02 + normalizedRow * 0.08 + cloneIndex * 0.1;
	const duration = 0.42 + getDeterministicRandom(baseSeed + 1) * 0.38;

	return {
		"--films-marquee-card-delay": `${delay.toFixed(2)}s`,
		"--films-marquee-card-duration": `${duration.toFixed(2)}s`,
	};
}

function MovieTickerCard({
	cloneIndex,
	itemIndex,
	movie,
	rowIndex,
}: {
	cloneIndex: number;
	itemIndex: number;
	movie: Movie;
	rowIndex: number;
}) {
	const imagePath =
		getTmdbImageUrl(movie.backdrop_path, "w300") ??
		getTmdbImageUrl(movie.poster_path, "w342");
	const animationStyle = getCardAnimationStyle(
		movie.id,
		rowIndex,
		itemIndex,
		cloneIndex
	);

	return (
		<article
			className="films-marquee-card relative size-64 shrink-0 overflow-hidden rounded-[1.6rem] bg-zinc-950 shadow-[0_10px_24px_rgba(24,24,27,0.1)]"
			style={animationStyle}
		>
			{imagePath ? (
				<img
					alt={movie.title}
					className="h-full w-full select-none object-cover"
					draggable={false}
					height={300}
					src={imagePath}
					width={300}
				/>
			) : null}
			<div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
			<div className="absolute inset-x-5 bottom-5">
				<p className="line-clamp-1 text-[0.7rem] text-white/70 sm:text-xs">
					{getGenreNames(movie.genre_ids.slice(0, 2)).join(" ∙ ") ||
						"Featured title"}
				</p>
				<h2 className="line-clamp-2 font-medium text-lg text-white tracking-[-0.03em] sm:text-xl">
					{movie.title}
				</h2>
			</div>
		</article>
	);
}

export default function MovieMarquee({ movies }: MovieMarqueeProps) {
	const rows = useMemo(
		() =>
			ROW_CONFIG.map((_, index) =>
				pickMovies(movies, MOVIES_PER_ROW * index, MOVIES_PER_ROW)
			),
		[movies]
	);

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
				{rows.map((row, rowIndex) => (
					<div
						className={`absolute top-1/2 left-1/2 w-dvw -translate-x-1/2 -translate-y-1/2 -rotate-[5deg] transform-gpu ${ROW_CONFIG[rowIndex].visibilityClass}`}
						key={`marquee-row-${ROW_CONFIG[rowIndex].duration}`}
						style={{ top: `calc(50% + ${ROW_CONFIG[rowIndex].offset}px)` }}
					>
						<div
							className="films-marquee-track"
							style={
								{
									"--films-marquee-duration": `${ROW_CONFIG[rowIndex].duration}s`,
								} as React.CSSProperties
							}
						>
							<div className="films-marquee-row">
								{row.map((pickedMovie, itemIndex) => (
									<MovieTickerCard
										cloneIndex={0}
										itemIndex={itemIndex}
										key={`row-a-${pickedMovie.key}`}
										movie={pickedMovie.movie}
										rowIndex={rowIndex}
									/>
								))}
							</div>
							<div className="films-marquee-row">
								{row.map((pickedMovie, itemIndex) => (
									<MovieTickerCard
										cloneIndex={1}
										itemIndex={itemIndex}
										key={`row-b-${pickedMovie.key}`}
										movie={pickedMovie.movie}
										rowIndex={rowIndex}
									/>
								))}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
