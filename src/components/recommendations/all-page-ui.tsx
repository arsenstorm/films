import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	ChevronUp,
	RefreshCcw,
} from "lucide-react";

import MediaCard from "@/components/media/card";
import MediaCardSkeleton from "@/components/media/skeleton";
import { DEFAULT_BROWSE_SEARCH } from "@/lib/media";
import type { BrowseMediaItem } from "@/lib/tmdb";
import type { RecommendationReviewResult } from "@/server/recommendations";

function RecommendationsAllShell({ children }: { children: React.ReactNode }) {
	return (
		<main className="min-h-dvh bg-zinc-100 px-4 py-4 antialiased sm:px-6 sm:py-6 dark:bg-zinc-950">
			<div className="mx-auto max-w-7xl">{children}</div>
		</main>
	);
}

function RecommendationsAllHeader() {
	return (
		<header className="flex items-center gap-3">
			<Link
				className="relative inline-flex items-center gap-2 px-1 py-2 font-medium text-sm text-zinc-600 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 dark:text-zinc-300 dark:hover:text-zinc-50"
				params={{ type: "all" }}
				search={DEFAULT_BROWSE_SEARCH}
				to="/$type"
			>
				<span className="-translate-1/2 absolute top-1/2 left-1/2 pointer-fine:hidden size-[max(100%,3rem)]" />
				<ArrowLeft className="size-5 sm:size-4" />
				Back to library
			</Link>
		</header>
	);
}

function RecommendationsAllHeading() {
	return (
		<section className="mt-6 border-zinc-200/70 border-b pb-6 dark:border-zinc-800/70">
			<h1 className="text-balance font-medium text-3xl text-zinc-950 tracking-tight sm:text-4xl dark:text-zinc-50">
				Recommendations
			</h1>
			<p className="mt-3 max-w-[48ch] text-pretty text-base/7 text-zinc-600 dark:text-zinc-300">
				These are the titles we've recommended to you.
			</p>
		</section>
	);
}

function RecommendationSectionHeader({
	count,
	title,
}: {
	count: number;
	title: string;
}) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<h2 className="min-w-0 truncate font-medium text-lg text-zinc-950 sm:text-xl dark:text-zinc-50">
				{title}
			</h2>
			<span className="shrink-0 rounded-full border border-zinc-200/80 bg-white px-3 py-1 font-medium text-sm text-zinc-600 tabular-nums ring-1 ring-black/5 dark:border-zinc-800/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/10">
				{count}
			</span>
		</div>
	);
}

function NewRecommendationsCard({ count }: { count: number }) {
	const recommendationLabel =
		count === 1 ? "recommendation" : "recommendations";

	return (
		<section className="mt-6">
			<div className="relative overflow-hidden rounded-4xl border border-white/30 bg-[linear-gradient(135deg,rgba(244,63,94,0.96),rgba(249,115,22,0.9)_34%,rgba(245,158,11,0.86)_52%,rgba(59,130,246,0.88)_100%)] p-6 text-white shadow-[0_36px_120px_rgba(24,24,27,0.2)] sm:p-8">
				<div className="pointer-events-none absolute -top-16 right-0 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
				<div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-zinc-950/18 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-4xl space-y-3">
						<h2 className="text-balance font-medium text-3xl tracking-tight sm:text-4xl">
							{count} new {recommendationLabel} are waiting.
						</h2>
						<p className="max-w-136 text-pretty text-base/7 text-white/88">
							We&apos;ve selected more titles that we think you&apos;ll like.
						</p>
						<Link
							className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-3 font-medium text-sm text-zinc-950 shadow-[0_18px_48px_rgba(24,24,27,0.18)] transition-transform focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 active:scale-[0.99]"
							params={{ type: "recommendations", id: "new" }}
							to="/recommendations"
						>
							See latest picks
							<ArrowRight className="size-4" />
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}

function RecommendationGrid<TItem extends { media: BrowseMediaItem }>({
	emptyMessage,
	items,
}: {
	emptyMessage: string;
	items: TItem[];
}) {
	if (items.length === 0) {
		return (
			<p className="mt-4 max-w-[44ch] text-pretty text-base/7 text-zinc-500 dark:text-zinc-400">
				{emptyMessage}
			</p>
		);
	}

	return (
		<div className="mt-6">
			<div className="grid gap-0.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
				{items.map((item) => (
					<MediaCard
						key={`${item.media.mediaType}-${item.media.id}`}
						media={item.media}
						type={item.media.mediaType}
					/>
				))}
			</div>
		</div>
	);
}

export function RecommendationsAllLoadingState() {
	const skeletonKeys = Array.from(
		{ length: 10 },
		(_, index) => `recommendation-review-skeleton-${index}`
	);

	return (
		<RecommendationsAllShell>
			<RecommendationsAllHeader />
			<RecommendationsAllHeading />
			<div className="mt-10 space-y-10">
				{["Interested in", "Hidden"].map((title) => (
					<section
						className="border-zinc-200/70 border-t pt-6 dark:border-zinc-800/70"
						key={title}
					>
						<RecommendationSectionHeader count={0} title={title} />
						<div className="mt-4 grid gap-0.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
							{skeletonKeys.map((key) => (
								<MediaCardSkeleton key={key} />
							))}
						</div>
					</section>
				))}
			</div>
		</RecommendationsAllShell>
	);
}

export function RecommendationsAllErrorState({
	errorMessage,
	onRetry,
}: {
	errorMessage: string;
	onRetry: () => Promise<void> | void;
}) {
	return (
		<RecommendationsAllShell>
			<RecommendationsAllHeader />
			<RecommendationsAllHeading />
			<div className="flex min-h-[40dvh] items-center justify-center px-5 py-10">
				<div className="max-w-xl text-center">
					<h2 className="text-balance font-medium text-3xl text-zinc-950 tracking-tight dark:text-zinc-50">
						We couldn&apos;t load your recommendation history.
					</h2>
					<p className="mt-4 text-pretty text-base/7 text-zinc-600 dark:text-zinc-300">
						{errorMessage}
					</p>
					<button
						className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 font-medium text-base text-white outline-offset-2 ring-1 ring-zinc-950 transition-transform focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.99] dark:bg-zinc-100 dark:text-zinc-950 dark:ring-zinc-100"
						onClick={onRetry}
						type="button"
					>
						<RefreshCcw className="size-5 sm:size-4" />
						Try again
					</button>
				</div>
			</div>
		</RecommendationsAllShell>
	);
}

export function RecommendationsAllEmptyState() {
	return (
		<RecommendationsAllShell>
			<RecommendationsAllHeader />
			<RecommendationsAllHeading />
			<div className="flex min-h-[40dvh] items-center justify-center px-5 py-10">
				<div className="max-w-xl text-center">
					<h2 className="text-balance font-medium text-3xl text-zinc-950 tracking-tight dark:text-zinc-50">
						There&apos;s nothing here yet.
					</h2>
					<p className="mt-4 text-pretty text-base/7 text-zinc-600 dark:text-zinc-300">
						Start swiping through recommendations and this page will keep the
						new, interested, and hidden titles together in one place.
					</p>
					<Link
						className="mt-6 inline-flex min-h-11 items-center rounded-full border border-zinc-200/80 bg-white px-4 py-3 font-medium text-sm text-zinc-950 ring-1 ring-black/5 transition-transform focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 active:scale-[0.99] dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10"
						params={{ type: "recommendations", id: "new" }}
						to="/recommendations"
					>
						See recommendations
					</Link>
				</div>
			</div>
		</RecommendationsAllShell>
	);
}

export function InterestedRecommendationsSection({
	hasNewRecommendations,
	items,
}: {
	hasNewRecommendations: boolean;
	items: RecommendationReviewResult["interested"];
}) {
	return (
		<section
			className={
				hasNewRecommendations
					? "border-zinc-200/70 border-t pt-6 dark:border-zinc-800/70"
					: "pt-0"
			}
		>
			<RecommendationSectionHeader count={items.length} title="Interested in" />
			<RecommendationGrid
				emptyMessage="Right-swiped titles that you leave untracked will collect here."
				items={items}
			/>
		</section>
	);
}

export function HiddenRecommendationsSection({
	isOpen,
	items,
	onToggle,
}: {
	isOpen: boolean;
	items: RecommendationReviewResult["hidden"];
	onToggle: () => void;
}) {
	return (
		<section className="border-zinc-200/70 border-t pt-6 dark:border-zinc-800/70">
			<button
				aria-controls="hidden-recommendations"
				aria-expanded={isOpen}
				className="flex w-full items-center justify-between gap-4 text-left"
				onClick={onToggle}
				type="button"
			>
				<RecommendationSectionHeader count={items.length} title="Hidden" />
				<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-600 ring-1 ring-black/5 transition-colors hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/10 dark:hover:text-zinc-50">
					{isOpen ? (
						<ChevronUp className="size-5" />
					) : (
						<ChevronDown className="size-5" />
					)}
				</span>
			</button>
			{isOpen ? (
				<div className="mt-7" id="hidden-recommendations">
					<RecommendationGrid
						emptyMessage="You haven’t hidden any recommendations yet."
						items={items}
					/>
				</div>
			) : null}
		</section>
	);
}

export function RecommendationsAllLayout({
	children,
	newRecommendationsCount,
}: {
	children: React.ReactNode;
	newRecommendationsCount: number;
}) {
	return (
		<RecommendationsAllShell>
			<RecommendationsAllHeader />
			<RecommendationsAllHeading />
			{newRecommendationsCount > 0 ? (
				<NewRecommendationsCard count={newRecommendationsCount} />
			) : null}
			<div className="mt-6 mb-16 space-y-10">{children}</div>
		</RecommendationsAllShell>
	);
}
