import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import MediaCard from "@/components/media/card";
import MediaCardSkeleton from "@/components/media/skeleton";
import { type BrowseView, getBrowseHref, type MediaType } from "@/lib/media";
import type { Movie, Show } from "@/lib/tmdb";

const SKELETON_KEYS = Array.from(
	{ length: 20 },
	(_, index) => `media-card-skeleton-${index}`
);

type MediaGridItem = Movie | Show;

interface MediaGridResponse<T extends MediaGridItem> {
	page: number;
	results: T[];
	total_pages: number;
}

interface MediaGridProps<T extends MediaGridItem> {
	data: MediaGridResponse<T>;
	mediaLabel: string;
	resolveItemType: (item: T) => MediaType;
	searchQuery: string;
	view: BrowseView;
}

export function MediaGridLoadingState() {
	return (
		<div className="grid gap-0.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{SKELETON_KEYS.map((key) => (
				<MediaCardSkeleton key={key} />
			))}
		</div>
	);
}

export function MediaGridErrorState({
	errorMessage,
	mediaLabel,
}: {
	errorMessage: string;
	mediaLabel: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-20">
			<p className="mb-2 text-lg text-red-500">Error loading {mediaLabel}</p>
			<p className="text-zinc-500 dark:text-zinc-400">{errorMessage}</p>
		</div>
	);
}

export default function MediaGrid<T extends MediaGridItem>({
	data,
	mediaLabel,
	resolveItemType,
	searchQuery,
	view,
}: MediaGridProps<T>) {
	const location = useLocation();
	const navigate = useNavigate();
	const items = data.results;
	const totalPages = Math.max(1, data.total_pages);
	const formattedPage = data.page.toLocaleString();
	const formattedTotalPages = totalPages.toLocaleString();
	const canGoToPreviousPage = data.page > 1;
	const canGoToNextPage = data.page < totalPages;

	function navigateToPage(nextPage: number): void {
		navigate({
			href: getBrowseHref(location.pathname, {
				page: nextPage,
				q: searchQuery,
				view,
			}),
			resetScroll: true,
		}).catch(() => {
			return undefined;
		});
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20">
				<p className="text-lg text-zinc-500 dark:text-zinc-400">
					{searchQuery
						? `No ${mediaLabel} found for "${searchQuery}"`
						: `No ${mediaLabel} found`}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-0.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
				{items.map((item) => {
					const itemType = resolveItemType(item);

					return (
						<MediaCard
							key={`${itemType}-${item.id}`}
							media={item}
							type={itemType}
						/>
					);
				})}
			</div>
			{totalPages > 1 ? (
				<nav
					aria-label={`${mediaLabel} pagination`}
					className="flex items-center justify-center gap-3"
				>
					<button
						className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 font-medium text-sm text-zinc-950 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-50"
						disabled={!canGoToPreviousPage}
						onClick={() => {
							navigateToPage(data.page - 1);
						}}
						type="button"
					>
						<ChevronLeft className="-ml-1 size-4" />
						<span>Previous</span>
					</button>
					<p className="min-w-28 text-center font-medium text-sm text-zinc-500 dark:text-zinc-400">
						Page {formattedPage} of {formattedTotalPages}
					</p>
					<button
						className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 font-medium text-sm text-zinc-950 shadow-[0_12px_40px_rgba(24,24,27,0.12)] backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:text-zinc-50"
						disabled={!canGoToNextPage}
						onClick={() => {
							navigateToPage(data.page + 1);
						}}
						type="button"
					>
						<span>Next</span>
						<ChevronRight className="-mr-1 size-4" />
					</button>
				</nav>
			) : null}
		</div>
	);
}
