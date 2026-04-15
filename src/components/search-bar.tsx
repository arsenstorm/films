import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import ThemeToggle from "@/components/theme-toggle";
import { fetchAllMedia, fetchMovies, fetchShows } from "@/lib/browse";
import {
	type BrowseMediaType,
	type BrowseView,
	getBrowseHref,
	parseBrowseSearch,
} from "@/lib/media";
import { getBrowseQueryKey } from "@/lib/query";

const browseViewOptions: Array<{ label: string; value: BrowseView }> = [
	{
		label: "Discover",
		value: "discover",
	},
	{
		label: "Watchlist",
		value: "watchlist",
	},
	{
		label: "Favourites",
		value: "favorites",
	},
	{
		label: "Watched",
		value: "watched",
	},
];

const browseTypeOptions: Array<{
	label: string;
	value: BrowseMediaType;
}> = [
	{
		label: "All",
		value: "all",
	},
	{
		label: "Movies",
		value: "movies",
	},
	{
		label: "TV Shows",
		value: "tv",
	},
];

function getBrowsePlaceholder(type: BrowseMediaType): string {
	if (type === "all") {
		return "Search titles...";
	}

	return type === "tv" ? "Search TV shows..." : "Search movies...";
}

interface SearchBarProps {
	isSpecialUser?: boolean;
}

export default function SearchBar({ isSpecialUser = false }: SearchBarProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { isPending, setTheme, theme } = useTheme();
	let currentType: BrowseMediaType = "movies";

	if (location.pathname === "/all") {
		currentType = "all";
	} else if (location.pathname === "/tv") {
		currentType = "tv";
	}
	const isBrowsePage =
		location.pathname === "/all" ||
		location.pathname === "/movies" ||
		location.pathname === "/tv";
	const searchPlaceholder = getBrowsePlaceholder(currentType);
	const searchParams = new URLSearchParams(location.searchStr);
	const currentSearch = parseBrowseSearch({
		page: searchParams.get("page"),
		q: searchParams.get("q"),
		view: searchParams.get("view"),
	});
	const currentSearchValue = currentSearch.q;
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const [searchValue, setSearchValue] = useState(currentSearchValue);

	function prefetchBrowse(
		type: BrowseMediaType,
		view: BrowseView,
		query: string
	): void {
		if (type === "all") {
			queryClient
				.prefetchQuery({
					queryFn: () => fetchAllMedia(query, 1, view),
					queryKey: getBrowseQueryKey({
						page: 1,
						searchQuery: query,
						type,
						view,
					}),
				})
				.catch(() => {
					return undefined;
				});

			return;
		}

		if (type === "movies") {
			queryClient
				.prefetchQuery({
					queryFn: () => fetchMovies(query, 1, view),
					queryKey: getBrowseQueryKey({
						page: 1,
						searchQuery: query,
						type,
						view,
					}),
				})
				.catch(() => {
					return undefined;
				});

			return;
		}

		queryClient
			.prefetchQuery({
				queryFn: () => fetchShows(query, 1, view),
				queryKey: getBrowseQueryKey({
					page: 1,
					searchQuery: query,
					type,
					view,
				}),
			})
			.catch(() => {
				return undefined;
			});
	}

	useEffect(() => {
		setSearchValue(currentSearchValue);
	}, [currentSearchValue]);

	useEffect(() => {
		if (!isBrowsePage) {
			return;
		}

		if (searchValue === currentSearchValue) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			const currentHref = `${location.pathname}${location.searchStr}`;
			const nextHref = getBrowseHref(location.pathname, {
				page: 1,
				q: searchValue,
				view: currentSearch.view,
			});

			if (currentHref !== nextHref) {
				navigate({
					href: nextHref,
					replace: true,
				}).catch(() => {
					return undefined;
				});
			}
		}, 300);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [
		currentSearchValue,
		currentSearch.view,
		isBrowsePage,
		location.pathname,
		location.searchStr,
		navigate,
		searchValue,
	]);

	return (
		<>
			<div className="flex w-full items-center gap-3 lg:hidden">
				<Link to="/">
					<span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-4 py-3 font-medium text-xs shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
						Home
					</span>
				</Link>
				<div className="relative min-w-0 flex-1">
					<Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-5 -translate-y-1/2 text-zinc-700 dark:text-zinc-200" />
					<input
						className="min-h-11 w-full rounded-full border border-zinc-200/80 bg-white/85 py-2.5 pr-10 pl-10 text-sm text-zinc-950 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md transition placeholder:text-zinc-500 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300/70 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-50 dark:focus:border-zinc-700 dark:focus:ring-zinc-700/70 dark:placeholder:text-zinc-400"
						onChange={(event) => {
							setSearchValue(event.target.value);
						}}
						placeholder={searchPlaceholder}
						type="text"
						value={searchValue}
					/>
					{searchValue ? (
						<button
							className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
							onClick={() => {
								setSearchValue("");
							}}
							type="button"
						>
							<X className="size-5" />
						</button>
					) : null}
				</div>
				<button
					aria-expanded={isMobileSidebarOpen}
					aria-label="Open browse menu"
					className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-200/80 bg-white/85 text-zinc-700 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md transition-colors hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-200 dark:hover:text-zinc-50"
					onClick={() => {
						setIsMobileSidebarOpen(true);
					}}
					type="button"
				>
					<Menu className="size-5" />
				</button>
			</div>

			<div className="hidden w-full lg:grid lg:grid-cols-3 lg:gap-4">
				<div className="flex items-center gap-4">
					<Link to="/">
						<span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-4 py-3.5 font-medium text-xs shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
							Home
						</span>
					</Link>
					<div className="inline-flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/85 p-1 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
						{browseTypeOptions.map((option) => {
							const isActive = location.pathname.startsWith(`/${option.value}`);

							return (
								<Link
									aria-pressed={isActive}
									className={clsx(
										"inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-2 font-medium text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-70",
										isActive
											? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
											: "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
									)}
									disabled={isPending}
									key={option.value}
									onClick={() => {
										setIsMobileSidebarOpen(false);
									}}
									onFocus={() => {
										prefetchBrowse(
											option.value,
											currentSearch.view,
											searchValue
										);
									}}
									onMouseEnter={() => {
										prefetchBrowse(
											option.value,
											currentSearch.view,
											searchValue
										);
									}}
									params={{
										type: option.value,
									}}
									search={{
										page: 1,
										q: searchValue,
										view: currentSearch.view,
									}}
									to="/$type"
								>
									<span>{option.label}</span>
								</Link>
							);
						})}
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-md">
					<Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-5 -translate-y-1/2 text-zinc-700 dark:text-zinc-200" />
					<input
						className="min-h-11 w-full rounded-full border border-zinc-200/80 bg-white/85 py-2.5 pr-10 pl-10 text-sm! text-zinc-950 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md transition placeholder:text-zinc-500 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300/70 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-50 dark:focus:border-zinc-700 dark:focus:ring-zinc-700/70 dark:placeholder:text-zinc-400"
						onChange={(event) => {
							setSearchValue(event.target.value);
						}}
						placeholder={searchPlaceholder}
						type="text"
						value={searchValue}
					/>
					{searchValue ? (
						<button
							className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
							onClick={() => {
								setSearchValue("");
							}}
							type="button"
						>
							<X className="size-5" />
						</button>
					) : null}
				</div>

				<div className="flex min-w-0 flex-1 items-center justify-end gap-3">
					{isSpecialUser ? (
						<Link
							className="inline-flex min-h-9 items-center rounded-full px-3 py-2 font-medium text-xs text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
							to="/recommendations"
						>
							Recommendations
						</Link>
					) : null}
					<div className="inline-flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/85 p-1 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
						{browseViewOptions.map((option) => {
							const isActive = currentSearch.view === option.value;

							return (
								<Link
									aria-pressed={isActive}
									className={clsx(
										"inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-2 font-medium text-xs transition-colors",
										isActive
											? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
											: "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
									)}
									key={option.value}
									onClick={() => {
										setIsMobileSidebarOpen(false);
									}}
									onFocus={() => {
										prefetchBrowse(currentType, option.value, searchValue);
									}}
									onMouseEnter={() => {
										prefetchBrowse(currentType, option.value, searchValue);
									}}
									params={{
										type: currentType,
									}}
									search={{
										page: 1,
										q: searchValue,
										view: option.value,
									}}
									to="/$type"
								>
									{option.label}
								</Link>
							);
						})}
					</div>
					<ThemeToggle
						isPending={isPending}
						onThemeChange={setTheme}
						theme={theme}
					/>
				</div>
			</div>
			{isMobileSidebarOpen ? (
				<div className="fixed inset-0 z-50 lg:hidden">
					<button
						aria-label="Close browse menu"
						className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]"
						onClick={() => {
							setIsMobileSidebarOpen(false);
						}}
						type="button"
					/>
					<aside className="absolute top-0 right-0 flex h-full w-[min(88vw,22rem)] flex-col gap-5 border-zinc-200/80 border-l bg-zinc-50/96 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[-24px_0_60px_rgba(24,24,27,0.16)] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/96">
						<div className="flex items-center justify-between">
							<p className="font-medium text-sm text-zinc-500 uppercase tracking-[0.18em] dark:text-zinc-400">
								Browse
							</p>
							<button
								aria-label="Close browse menu"
								className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-200/80 bg-white/85 text-zinc-700 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md transition-colors hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-200 dark:hover:text-zinc-50"
								onClick={() => {
									setIsMobileSidebarOpen(false);
								}}
								type="button"
							>
								<X className="size-5" />
							</button>
						</div>

						<div className="space-y-2">
							<p className="px-1 font-medium text-xs text-zinc-500 uppercase tracking-[0.16em] dark:text-zinc-400">
								Type
							</p>
							<div className="flex flex-col gap-2">
								{browseTypeOptions.map((option) => {
									const isActive = location.pathname.startsWith(
										`/${option.value}`
									);

									return (
										<Link
											aria-pressed={isActive}
											className={clsx(
												"inline-flex min-h-11 items-center rounded-full px-4 py-3 font-medium text-sm transition-colors",
												isActive
													? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
													: "border border-zinc-200/80 bg-white/85 text-zinc-600 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-300 dark:hover:text-zinc-100"
											)}
											key={option.value}
											onFocus={() => {
												prefetchBrowse(
													option.value,
													currentSearch.view,
													searchValue
												);
											}}
											onMouseEnter={() => {
												prefetchBrowse(
													option.value,
													currentSearch.view,
													searchValue
												);
											}}
											params={{
												type: option.value,
											}}
											search={{
												page: 1,
												q: searchValue,
												view: currentSearch.view,
											}}
											to="/$type"
										>
											{option.label}
										</Link>
									);
								})}
							</div>
						</div>

						<div className="space-y-2">
							<p className="px-1 font-medium text-xs text-zinc-500 uppercase tracking-[0.16em] dark:text-zinc-400">
								List
							</p>
							<div className="flex flex-col gap-2">
								{browseViewOptions.map((option) => {
									const isActive = currentSearch.view === option.value;

									return (
										<Link
											aria-pressed={isActive}
											className={clsx(
												"inline-flex min-h-11 items-center rounded-full px-4 py-3 font-medium text-sm transition-colors",
												isActive
													? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
													: "border border-zinc-200/80 bg-white/85 text-zinc-600 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-300 dark:hover:text-zinc-100"
											)}
											key={option.value}
											onFocus={() => {
												prefetchBrowse(currentType, option.value, searchValue);
											}}
											onMouseEnter={() => {
												prefetchBrowse(currentType, option.value, searchValue);
											}}
											params={{
												type: currentType,
											}}
											search={{
												page: 1,
												q: searchValue,
												view: option.value,
											}}
											to="/$type"
										>
											{option.label}
										</Link>
									);
								})}
							</div>
						</div>

						{isSpecialUser ? (
							<div className="space-y-2">
								<p className="px-1 font-medium text-xs text-zinc-500 uppercase tracking-[0.16em] dark:text-zinc-400">
									Extras
								</p>
								<Link
									className="inline-flex min-h-11 items-center rounded-full border border-zinc-200/80 bg-white/85 px-4 py-3 font-medium text-sm text-zinc-600 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md transition-colors hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-300 dark:hover:text-zinc-100"
									onClick={() => {
										setIsMobileSidebarOpen(false);
									}}
									to="/recommendations"
								>
									Recommendations
								</Link>
							</div>
						) : null}

						<div className="mt-auto flex items-center justify-between rounded-[1.25rem] border border-zinc-200/80 bg-white/85 px-3 py-2 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
							<p className="font-medium text-sm text-zinc-600 dark:text-zinc-300">
								Theme
							</p>
							<ThemeToggle
								isPending={isPending}
								onThemeChange={setTheme}
								theme={theme}
							/>
						</div>
					</aside>
				</div>
			) : null}
		</>
	);
}
