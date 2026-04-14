import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowUpRight, Check, X } from "lucide-react";
import { Carousel } from "motion-plus/react";
import { type ReactNode, useEffect, useState } from "react";
import type { MediaType } from "@/lib/media";
import { getTmdbImageUrl, type WatchProviderResponse } from "@/lib/tmdb";
import { getMediaWatchProvidersFn } from "@/server/tmdb";

interface WatchProvidersPanelProps {
	id: number;
	type: MediaType;
}

interface ProviderSummary {
	countries: number;
	logoPath: string | null;
	name: string;
	providerId: number;
}

interface RegionalAvailability {
	buy: boolean;
	code: string;
	link: string;
	name: string;
	rent: boolean;
	stream: boolean;
}

type AvailabilityMode = "buy" | "rent" | "stream";

function getCountryName(countryCode: string): string {
	try {
		const displayNames = new Intl.DisplayNames(["en"], {
			type: "region",
		});

		return displayNames.of(countryCode) ?? countryCode;
	} catch {
		return countryCode;
	}
}

function getCountryFlag(countryCode: string): string {
	return countryCode
		.toUpperCase()
		.replaceAll(/./g, (character) =>
			String.fromCodePoint(127_397 + character.charCodeAt(0))
		);
}

function buildProviderSummaries(
	response: WatchProviderResponse
): ProviderSummary[] {
	const providerMap = new Map<number, ProviderSummary>();

	for (const availability of Object.values(response.results)) {
		if (!availability) {
			continue;
		}

		const providerIdsSeenInCountry = new Set<number>();

		for (const provider of [
			...(availability.flatrate ?? []),
			...(availability.rent ?? []),
			...(availability.buy ?? []),
		]) {
			if (providerIdsSeenInCountry.has(provider.provider_id)) {
				continue;
			}

			providerIdsSeenInCountry.add(provider.provider_id);
			const existingProvider = providerMap.get(provider.provider_id);

			if (existingProvider) {
				existingProvider.countries += 1;
				continue;
			}

			providerMap.set(provider.provider_id, {
				countries: 1,
				logoPath: provider.logo_path,
				name: provider.provider_name,
				providerId: provider.provider_id,
			});
		}
	}

	return [...providerMap.values()].sort((left, right) => {
		if (right.countries !== left.countries) {
			return right.countries - left.countries;
		}

		return left.name.localeCompare(right.name);
	});
}

function buildRegionalAvailability(
	response: WatchProviderResponse,
	providerId?: number
): RegionalAvailability[] {
	return Object.entries(response.results)
		.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] =>
			Boolean(entry[1])
		)
		.map(([code, availability]) => {
			const hasStream = providerId
				? (availability.flatrate?.some(
						(provider) => provider.provider_id === providerId
					) ?? false)
				: Boolean(availability.flatrate?.length);
			const hasRent = providerId
				? (availability.rent?.some(
						(provider) => provider.provider_id === providerId
					) ?? false)
				: Boolean(availability.rent?.length);
			const hasBuy = providerId
				? (availability.buy?.some(
						(provider) => provider.provider_id === providerId
					) ?? false)
				: Boolean(availability.buy?.length);

			return {
				buy: hasBuy,
				code,
				link: availability.link,
				name: getCountryName(code),
				rent: hasRent,
				stream: hasStream,
			};
		})
		.filter((availability) =>
			providerId
				? availability.stream || availability.rent || availability.buy
				: true
		)
		.sort((left, right) => left.name.localeCompare(right.name));
}

function AvailabilityCell({ isAvailable }: { isAvailable: boolean }) {
	return (
		<span
			className={clsx(
				"inline-flex size-9 items-center justify-center rounded-full",
				isAvailable
					? "bg-emerald-500/16 text-emerald-300"
					: "bg-rose-500/16 text-rose-300"
			)}
		>
			{isAvailable ? <Check className="size-4" /> : <X className="size-4" />}
		</span>
	);
}

function getVisibleAvailabilityModes(
	regionalAvailability: RegionalAvailability[]
): AvailabilityMode[] {
	const visibleModes: AvailabilityMode[] = [];

	if (regionalAvailability.some((country) => country.stream)) {
		visibleModes.push("stream");
	}

	if (regionalAvailability.some((country) => country.rent)) {
		visibleModes.push("rent");
	}

	if (regionalAvailability.some((country) => country.buy)) {
		visibleModes.push("buy");
	}

	return visibleModes;
}

export default function WatchProvidersPanel({
	id,
	type,
}: WatchProvidersPanelProps) {
	const [selectedProviderId, setSelectedProviderId] = useState<number | null>(
		null
	);
	const { data, error, isLoading } = useQuery({
		queryFn: () =>
			getMediaWatchProvidersFn({
				data: {
					id,
					type,
				},
			}),
		queryKey: ["media-watch-providers", type, id],
	});

	const providerSummaries = data ? buildProviderSummaries(data) : [];
	const selectedProvider =
		providerSummaries.find(
			(provider) => provider.providerId === selectedProviderId
		) ??
		providerSummaries[0] ??
		null;
	const regionalAvailability = data
		? buildRegionalAvailability(data, selectedProvider?.providerId)
		: [];

	useEffect(() => {
		if (providerSummaries.length === 0) {
			setSelectedProviderId(null);
			return;
		}

		const hasSelectedProvider = providerSummaries.some(
			(provider) => provider.providerId === selectedProviderId
		);

		if (!hasSelectedProvider) {
			setSelectedProviderId(providerSummaries[0]?.providerId ?? null);
		}
	}, [providerSummaries, selectedProviderId]);

	let content: ReactNode;

	if (isLoading) {
		content = (
			<div className="space-y-6">
				<div className="relative px-10">
					<div className="grid grid-cols-3 gap-4 lg:grid-cols-5">
						{Array.from(
							{ length: 5 },
							(_, index) => `provider-skeleton-${index}`
						).map((key) => (
							<div className="animate-pulse" key={key}>
								<div className="aspect-square rounded-4xl bg-white/8" />
								<div className="mt-4 h-6 rounded bg-white/8" />
								<div className="mt-2 h-5 w-2/3 rounded bg-white/8" />
							</div>
						))}
					</div>
				</div>
				<div className="animate-pulse border-white/8 border-t pt-5">
					<div className="h-6 w-40 rounded bg-white/8" />
					<div className="mt-4 space-y-2">
						{Array.from(
							{ length: 4 },
							(_, index) => `row-skeleton-${index}`
						).map((key) => (
							<div
								className="grid grid-cols-[minmax(0,1fr)_4rem_4rem_4rem] items-center gap-3 border-white/6 border-b py-3"
								key={key}
							>
								<div className="h-5 rounded bg-white/8" />
								<div className="mx-auto h-9 w-9 rounded-full bg-white/8" />
								<div className="mx-auto h-9 w-9 rounded-full bg-white/8" />
								<div className="mx-auto h-9 w-9 rounded-full bg-white/8" />
							</div>
						))}
					</div>
				</div>
			</div>
		);
	} else if (error) {
		content = (
			<div className="border-white/8 border-t pt-5 text-zinc-300">
				{error instanceof Error
					? error.message
					: "Unable to load watch providers right now."}
			</div>
		);
	} else if (!data || regionalAvailability.length === 0) {
		content = (
			<div className="border-white/8 border-t pt-5 text-zinc-300">
				This title is not available on any streaming platforms at this time.
			</div>
		);
	} else {
		const visibleAvailabilityModes =
			getVisibleAvailabilityModes(regionalAvailability);
		const tableColumns = `minmax(0,1fr) ${visibleAvailabilityModes
			.map(() => "4rem")
			.join(" ")} 2.5rem`;
		const providerItems = providerSummaries.map((provider) => {
			const logoUrl = getTmdbImageUrl(provider.logoPath, "w92");
			const isSelected = provider.providerId === selectedProvider?.providerId;

			return (
				<button
					className={clsx(
						"w-32 shrink-0 text-left transition-opacity duration-150 lg:w-34",
						"data-[selected=true]:opacity-100",
						"data-[selected=false]:opacity-78 data-[selected=false]:hover:opacity-100"
					)}
					data-selected={isSelected}
					key={provider.providerId}
					onClick={() => {
						setSelectedProviderId(provider.providerId);
					}}
					type="button"
				>
					<div
						className={clsx(
							"flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-transparent p-3 transition-colors hover:bg-white/4 data-[selected=true]:bg-white/9"
						)}
						data-selected={isSelected}
					>
						<div className="flex w-full max-w-18 items-center justify-center overflow-hidden rounded-2xl">
							{logoUrl ? (
								<img
									alt={provider.name}
									className="pointer-events-none h-full w-full object-cover"
									height={92}
									src={logoUrl}
									width={92}
								/>
							) : (
								<span className="px-2 py-6 text-center font-medium text-xs text-zinc-700">
									{provider.name}
								</span>
							)}
						</div>

						<div className="mt-3 flex min-w-0 flex-col items-center justify-center px-1">
							<p className="max-w-32 truncate text-lg text-white leading-none tracking-tight">
								{provider.name}
							</p>
							<p className="mt-1 text-sm text-zinc-500">
								{provider.countries}{" "}
								{provider.countries === 1 ? "country" : "countries"}
							</p>
						</div>
					</div>
				</button>
			);
		});

		content = (
			<div className="space-y-6">
				<div className="relative">
					<Carousel
						align="start"
						as="div"
						className="w-full"
						fade={72}
						gap={18}
						items={providerItems}
						loop={false}
						snap="page"
						transition={{
							damping: 40,
							stiffness: 220,
							type: "spring",
						}}
					/>
				</div>

				<div className="border-white/8 border-t pt-5">
					<div
						className="mb-4 grid items-center gap-3 px-1"
						style={{ gridTemplateColumns: tableColumns }}
					>
						<p className="font-medium text-sm text-zinc-500">Countries</p>
						{visibleAvailabilityModes.includes("stream") ? (
							<p className="text-center font-medium text-sm text-zinc-500">
								Stream
							</p>
						) : null}
						{visibleAvailabilityModes.includes("rent") ? (
							<p className="text-center font-medium text-sm text-zinc-500">
								Rent
							</p>
						) : null}
						{visibleAvailabilityModes.includes("buy") ? (
							<p className="text-center font-medium text-sm text-zinc-500">
								Buy
							</p>
						) : null}
						<span />
					</div>
					<div className="space-y-2">
						{regionalAvailability.map((country) => (
							<div
								className="grid items-center gap-3 border-white/6 border-b px-1 py-3"
								key={country.code}
								style={{ gridTemplateColumns: tableColumns }}
							>
								<div className="flex min-w-0 items-center gap-3">
									<span className="text-xl">
										{getCountryFlag(country.code)}
									</span>
									<span className="truncate font-medium text-sm">
										{country.name}
									</span>
								</div>
								{visibleAvailabilityModes.includes("stream") ? (
									<div className="flex justify-center">
										<AvailabilityCell isAvailable={country.stream} />
									</div>
								) : null}
								{visibleAvailabilityModes.includes("rent") ? (
									<div className="flex justify-center">
										<AvailabilityCell isAvailable={country.rent} />
									</div>
								) : null}
								{visibleAvailabilityModes.includes("buy") ? (
									<div className="flex justify-center">
										<AvailabilityCell isAvailable={country.buy} />
									</div>
								) : null}
								<a
									className="inline-flex size-10 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-zinc-50"
									href={country.link}
									rel="noreferrer"
									target="_blank"
								>
									<ArrowUpRight className="size-4" />
								</a>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<section className="p-1 text-zinc-50 sm:p-2">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="font-medium text-2xl tracking-tight">
						Where to watch
					</h2>
					<p className="mt-1 text-sm text-zinc-400">
						Streaming, rental, and purchase availability by region
					</p>
				</div>
			</div>

			<div className="mt-6">{content}</div>
		</section>
	);
}
