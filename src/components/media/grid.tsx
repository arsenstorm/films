import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import MediaCard from "@/components/media/card";
import MediaCardSkeleton from "@/components/media/skeleton";
import {
	type BrowseMediaType,
	type BrowseView,
	getBrowseHref,
	type MediaType,
} from "@/lib/media";
import { getBrowseQueryKey } from "@/lib/query";
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
	browseType: BrowseMediaType;
	fetchItems: (
		searchQuery: string,
		page: number,
		view: BrowseView
	) => Promise<MediaGridResponse<T>>;
	mediaLabel: string;
	page: number;
	resolveItemType: (item: T) => MediaType;
	searchQuery: string;
	view: BrowseView;
}

export default function MediaGrid<T extends MediaGridItem>({
	browseType,
	fetchItems,
	mediaLabel,
	page,
	resolveItemType,
	searchQuery,
	view,
}: MediaGridProps<T>) {
	const location = useLocation();
	const navigate = useNavigate();
	const { data, error, isLoading } = useQuery({
		queryFn: () => fetchItems(searchQuery, page, view),
		queryKey: getBrowseQueryKey({
			page,
			searchQuery,
			type: browseType,
			view,
		}),
	});
	const items = data?.results ?? null;
	const totalPages = Math.max(1, data?.total_pages ?? 1);
	const formattedPage = page.toLocaleString();
	const formattedTotalPages = totalPages.toLocaleString();

	const canGoToPreviousPage = page > 1;
	const canGoToNextPage = page < totalPages;

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

	if (isLoading) {
		return (
			<div className="grid gap-0.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
				{SKELETON_KEYS.map((key) => (
					<MediaCardSkeleton key={key} />
				))}
			</div>
		);
	}

	if (error) {
		const errorMessage =
			error instanceof Error ? error.message : `Failed to fetch ${mediaLabel}`;

		return (
			<div className="flex flex-col items-center justify-center py-20">
				<p className="mb-2 text-lg text-red-500">Error loading {mediaLabel}</p>
				<p className="text-zinc-500 dark:text-zinc-400">{errorMessage}</p>
			</div>
		);
	}

	if (!items?.length) {
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
				{items.map((item) => (
					<MediaCard
						key={`${resolveItemType(item)}-${item.id}`}
						media={item}
						type={resolveItemType(item)}
					/>
				))}
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
							navigateToPage(page - 1);
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
							navigateToPage(page + 1);
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
