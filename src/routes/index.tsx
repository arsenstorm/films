import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import HeroShowcase from "@/components/landing/hero-showcase";
import MovieMarquee from "@/components/sign-in/movie-marquee";
import { useTheme } from "@/components/theme-provider";
import ThemeToggle from "@/components/theme-toggle";
import { DEFAULT_AUTHENTICATED_PATH } from "@/lib/auth";
import type { BrowseMediaType, BrowseView } from "@/lib/media";
import { getMarqueeMoviesFn } from "@/server/tmdb";

const primaryActionClassName =
	"inline-flex min-h-11 items-center gap-1 rounded-full bg-zinc-950 px-4 py-3 font-medium text-sm text-white shadow-[0_20px_60px_rgba(24,24,27,0.18)] transition-[background-color,transform] active:scale-[0.99] dark:bg-zinc-100 dark:text-zinc-950";
const headerToolbarClassName =
	"inline-flex items-center gap-1 rounded-full bg-white/58 p-1 ring-1 ring-black/5 shadow-[0_16px_48px_rgba(24,24,27,0.08)] backdrop-blur-xl dark:bg-zinc-950/58 dark:ring-white/10";
const headerControlSurfaceClassName =
	"rounded-full bg-white/72 ring-1 ring-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:bg-white/7 dark:ring-white/10 dark:shadow-none";
const headerThemeActionClassName = `relative inline-flex min-h-10 min-w-10 items-center justify-center ${headerControlSurfaceClassName} text-zinc-500 outline-offset-2 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-zinc-950 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-100`;
const headerActionClassName = `inline-flex min-h-10 items-center justify-center ${headerControlSurfaceClassName} px-4 py-2 font-medium text-sm text-zinc-950 outline-offset-2 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-950 active:scale-[0.99] dark:text-zinc-50 dark:hover:bg-white/10 dark:focus-visible:outline-zinc-100`;
const secondaryActionClassName =
	"inline-flex min-h-11 items-center font-medium text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50";
const panelClassName =
	"rounded-[2rem] border border-zinc-200/80 bg-white/88 shadow-[0_32px_120px_rgba(24,24,27,0.14)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/88 dark:shadow-[0_32px_120px_rgba(0,0,0,0.4)]";
const marqueeCtaPanelClassName =
	"relative isolate overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-zinc-950 text-white shadow-[0_32px_120px_rgba(24,24,27,0.14)] dark:border-zinc-800/80 dark:shadow-[0_32px_120px_rgba(0,0,0,0.4)]";
const marqueeCtaActionClassName =
	"inline-flex min-h-11 items-center gap-1 rounded-full bg-white/88 px-4 py-3 font-medium text-sm text-zinc-950 ring-1 ring-white/20 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-md transition-[background-color,transform,box-shadow] hover:bg-white active:scale-[0.99]";

const featureRows = [
	{
		description:
			"Save films and series you want to come back to, then switch from discovery to your own list without losing your place.",
		title: "Save it for later.",
	},
	{
		description:
			"Keep favourites separate from watched titles so you can remember what you loved and what is already done.",
		title: "Keep favourites close.",
	},
	{
		description:
			"Open any title to compare streaming, rental, and purchase options by country before you decide what to watch.",
		title: "Know where to watch.",
	},
] as const;

type FooterLinkItem =
	| {
			href: string;
			kind: "anchor";
			label: string;
	  }
	| {
			kind: "browse";
			label: string;
			type: BrowseMediaType;
			view?: BrowseView;
	  };

const footerLinkGroups = [
	{
		links: [
			{
				href: "#details",
				kind: "anchor",
				label: "What it does",
			},
			{
				kind: "browse",
				label: "Start tracking",
				type: "all",
			},
			{
				kind: "browse",
				label: "Browse movies",
				type: "movies",
			},
			{
				kind: "browse",
				label: "Browse TV shows",
				type: "tv",
			},
		],
		title: "Navigate",
	},
	{
		links: [
			{
				kind: "browse",
				label: "Watchlist",
				type: "all",
				view: "watchlist",
			},
			{
				kind: "browse",
				label: "Favourites",
				type: "all",
				view: "favorites",
			},
			{
				kind: "browse",
				label: "Watched",
				type: "all",
				view: "watched",
			},
		],
		title: "Library",
	},
] as const satisfies ReadonlyArray<{
	links: readonly FooterLinkItem[];
	title: string;
}>;

export const Route = createFileRoute("/")({
	component: LandingPage,
	head: () => ({
		meta: [
			{
				title: "Film Tracker | Films",
			},
			{
				name: "description",
				content:
					"Track movies and TV shows, search by title, save a watchlist, mark favourites and watched titles, and compare streaming, rental, and purchase options by country.",
			},
		],
	}),
	loader: async () => {
		const popularMovies = await getMarqueeMoviesFn().catch(() => []);

		return {
			popularMovies,
		};
	},
	ssr: "data-only",
});

function FeatureRow({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<div className="grid gap-3 px-6 py-6 lg:grid-cols-[4fr_8fr] lg:gap-6 lg:px-8">
			<dt className="font-medium text-xl text-zinc-950 dark:text-zinc-50">
				{title}
			</dt>
			<dd className="max-w-[40ch] text-pretty text-base text-zinc-600 dark:text-zinc-300">
				{description}
			</dd>
		</div>
	);
}

function FooterLinkGroup({
	links,
	title,
}: {
	links: readonly FooterLinkItem[];
	title: string;
}) {
	return (
		<nav aria-label={title}>
			<p className="font-medium text-sm text-zinc-500 dark:text-zinc-400">
				{title}
			</p>
			<ul className="mt-4 grid gap-3 text-base">
				{links.map((link) => (
					<li key={link.label}>
						{link.kind === "browse" ? (
							<Link
								className="font-normal text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
								params={{
									type: link.type,
								}}
								search={{
									page: 1,
									q: "",
									view: link.view ?? "discover",
								}}
								to="/$type"
							>
								{link.label}
							</Link>
						) : (
							<a
								className="font-normal text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
								href={link.href}
							>
								{link.label}
							</a>
						)}
					</li>
				))}
			</ul>
		</nav>
	);
}

function LandingPage() {
	const { popularMovies } = Route.useLoaderData();
	const { isPending, setTheme, theme } = useTheme();

	return (
		<main className="isolate min-h-dvh overflow-hidden bg-zinc-100 text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-50">
			<section className="relative overflow-hidden border-zinc-200/70 border-b dark:border-zinc-900">
				{popularMovies.length > 0 ? (
					<MovieMarquee movies={popularMovies} />
				) : null}
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.86),rgba(244,244,245,0.95)_34%,rgba(244,244,245,0.985)_60%,rgba(244,244,245,1)_78%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(39,39,42,0.3),rgba(9,9,11,0.8)_34%,rgba(9,9,11,0.95)_60%,rgba(9,9,11,0.985)_78%)]" />
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent via-zinc-100/30 to-zinc-100 dark:via-zinc-950/30 dark:to-zinc-950" />

				<div className="relative mx-auto max-w-7xl px-6 pt-6 pb-24 sm:pt-8 sm:pb-28 lg:pt-10 lg:pb-32">
					<header className="flex items-center justify-between gap-4">
						<Link
							aria-label="Homepage"
							className="inline-flex items-baseline gap-3"
							to="/"
						>
							<span className="font-medium text-2xl text-zinc-950 tracking-tight dark:text-zinc-50">
								Films
							</span>
						</Link>

						<div className={headerToolbarClassName}>
							<ThemeToggle
								className={headerThemeActionClassName}
								isPending={isPending}
								onThemeChange={setTheme}
								theme={theme}
							/>
							<Link
								className={headerActionClassName}
								search={{ next: DEFAULT_AUTHENTICATED_PATH }}
								to="/sign-in"
							>
								Sign in
							</Link>
						</div>
					</header>

					<div className="mt-16 grid items-center gap-8">
						<div className="py-6 sm:py-10">
							<h1 className="max-w-[12ch] text-balance font-medium text-5xl tracking-tight sm:text-6xl xl:text-7xl">
								Find your next watch.
							</h1>
							<p className="mt-6 max-w-[48ch] text-pretty text-base text-zinc-600 sm:text-lg dark:text-zinc-300">
								Search movies and TV shows, favourite titles or save titles to
								your watchlist, and find where you can watch them.
							</p>

							<div className="mt-8 flex flex-wrap items-center gap-4">
								<Link
									className={primaryActionClassName}
									search={{ next: DEFAULT_AUTHENTICATED_PATH }}
									to="/sign-in"
								>
									<span>Start tracking</span>
									<ArrowRight className="-mr-0.5 size-4" />
								</Link>
								<a className={secondaryActionClassName} href="#details">
									See what it does
								</a>
							</div>
						</div>

						<HeroShowcase movies={popularMovies} />
					</div>
				</div>
			</section>

			<section className="py-24 sm:py-28" id="details">
				<div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[7fr_13fr]">
					<div className="py-2">
						<h2 className="mt-4 max-w-[18ch] text-balance font-medium text-4xl tracking-tight">
							Search, save, and check availability in one place.
						</h2>
						<p className="mt-6 max-w-[44ch] text-pretty text-base text-zinc-600 sm:text-lg dark:text-zinc-300">
							Films is a personal tracker for movies and TV shows. Browse
							popular titles, search directly, keep your own lists, and open any
							title for provider details.
						</p>
					</div>

					<dl className={`${panelClassName} overflow-hidden`}>
						{featureRows.map((row, index) => (
							<div
								className={
									index === 0
										? undefined
										: "border-zinc-200/80 border-t dark:border-zinc-800/80"
								}
								key={row.title}
							>
								<FeatureRow description={row.description} title={row.title} />
							</div>
						))}
					</dl>
				</div>
			</section>

			<section className="pb-24 sm:pb-28">
				<div className="mx-auto max-w-7xl px-6">
					<div className={marqueeCtaPanelClassName}>
						{popularMovies.length > 0 ? (
							<div
								aria-hidden="true"
								className="mask-[linear-gradient(90deg,transparent_0%,transparent_20%,rgba(0,0,0,0.3)_42%,rgba(0,0,0,0.78)_64%,black_100%)] pointer-events-none absolute inset-0 overflow-hidden opacity-90 [-webkit-mask-image:linear-gradient(90deg,transparent_0%,transparent_20%,rgba(0,0,0,0.3)_42%,rgba(0,0,0,0.78)_64%,black_100%)]"
							>
								<div className="absolute inset-[-18%] origin-center scale-[0.74] sm:scale-[0.88] lg:scale-[1.02]">
									<MovieMarquee movies={popularMovies} />
								</div>
							</div>
						) : null}
						<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.92)_26%,rgba(0,0,0,0.74)_48%,rgba(0,0,0,0.36)_72%,rgba(0,0,0,0.14)_100%),linear-gradient(180deg,rgba(0,0,0,0.16)_0%,rgba(0,0,0,0.08)_34%,rgba(0,0,0,0.46)_100%)]" />

						<div className="relative flex min-h-96 flex-col justify-end px-6 py-10 sm:min-h-104 sm:px-8 sm:py-12 lg:px-10 lg:py-14 lg:pr-96">
							<h2 className="max-w-[16ch] text-balance font-medium text-4xl text-white tracking-tight sm:text-5xl">
								Keep your next watch in sight.
							</h2>
							<p className="mt-6 max-w-[44ch] text-pretty text-base text-white/74 sm:text-lg">
								Sign in to save movies and TV shows, separate favourites from
								watched titles, and jump from discovery straight into provider
								details when you are ready to press play.
							</p>
							<div className="mt-8">
								<Link
									className={marqueeCtaActionClassName}
									search={{ next: DEFAULT_AUTHENTICATED_PATH }}
									to="/sign-in"
								>
									<span>Open Films</span>
									<ArrowRight className="-mr-0.5 size-4" />
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			<footer className="pb-10 sm:pb-12">
				<div className="mx-auto max-w-7xl px-6">
					<div className={`${panelClassName} overflow-hidden`}>
						<div className="grid gap-8 px-6 py-8 lg:grid-cols-[8fr_4fr_4fr] lg:px-8 lg:py-10">
							<div className="max-w-[40ch]">
								<Link
									aria-label="Homepage"
									className="inline-flex items-baseline gap-3"
									to="/"
								>
									<span className="font-medium text-2xl text-zinc-950 tracking-tight dark:text-zinc-50">
										Films
									</span>
								</Link>
								<p className="mt-6 max-w-[38ch] text-pretty text-base text-zinc-500 dark:text-zinc-400">
									Track movies and TV shows, keep a watchlist, and check where
									to watch.
								</p>
							</div>

							{footerLinkGroups.map((group) => (
								<FooterLinkGroup
									key={group.title}
									links={group.links}
									title={group.title}
								/>
							))}
						</div>

						<div className="border-zinc-200/80 border-t px-6 py-4 lg:px-8 dark:border-zinc-800/80">
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Crafted in London by{" "}
								<a
									className="font-normal text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
									href="https://arsenstorm.com"
									rel="noreferrer"
									target="_blank"
								>
									Arsen Shkrumelyak
								</a>
								.
							</p>
						</div>
					</div>
				</div>
			</footer>
		</main>
	);
}
