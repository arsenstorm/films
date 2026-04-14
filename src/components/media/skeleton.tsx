export default function MediaCardSkeleton() {
	return (
		<div className="animate-pulse rounded-3xl bg-white p-4 dark:bg-zinc-900">
			<div className="flex items-center justify-between">
				<div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
				<div className="h-5 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
			</div>
			<div className="relative mx-auto my-8 aspect-2/3 w-full max-w-48 overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
			<div className="flex items-center justify-between">
				<div className="h-5 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
				<div className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
			</div>
		</div>
	);
}
