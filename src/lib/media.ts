export type MediaType = "movies" | "tv";
export type BrowseView = "discover" | "watchlist" | "favorites" | "watched";
export type MediaViewTransitionElement =
	| "back-link"
	| "content"
	| "meta"
	| "poster"
	| "tagline"
	| "title";

export interface BrowseSearch {
	page: number;
	q: string;
	view: BrowseView;
}

export const DEFAULT_BROWSE_SEARCH: BrowseSearch = {
	page: 1,
	q: "",
	view: "discover",
};

const VALID_MEDIA_TYPES = new Set<MediaType>(["movies", "tv"]);
const VALID_BROWSE_VIEWS = new Set<BrowseView>([
	"discover",
	"watchlist",
	"favorites",
	"watched",
]);
const BROWSE_PATH_PATTERN = /^\/(movies|tv)\/?$/;
const DETAILS_PATH_PATTERN = /^\/(movies|tv)\/\d+\/?$/;

export function parseBrowseSearch(
	search: Record<string, unknown>
): BrowseSearch {
	let page = Number.NaN;

	if (typeof search.page === "number") {
		page = search.page;
	} else if (typeof search.page === "string") {
		page = Number(search.page);
	}

	return {
		page:
			Number.isInteger(page) && page > 0 ? page : DEFAULT_BROWSE_SEARCH.page,
		q: typeof search.q === "string" ? search.q : DEFAULT_BROWSE_SEARCH.q,
		view:
			typeof search.view === "string" &&
			VALID_BROWSE_VIEWS.has(search.view as BrowseView)
				? (search.view as BrowseView)
				: DEFAULT_BROWSE_SEARCH.view,
	};
}

export function getBrowseHref(pathname: string, search: BrowseSearch): string {
	const searchParams = new URLSearchParams();
	const trimmedQuery = search.q.trim();

	if (trimmedQuery) {
		searchParams.set("q", trimmedQuery);
	}

	if (search.page > 1) {
		searchParams.set("page", String(search.page));
	}

	if (search.view !== DEFAULT_BROWSE_SEARCH.view) {
		searchParams.set("view", search.view);
	}

	const searchString = searchParams.toString();

	return searchString ? `${pathname}?${searchString}` : pathname;
}

export function parseMediaType(value: string): MediaType {
	if (VALID_MEDIA_TYPES.has(value as MediaType)) {
		return value as MediaType;
	}

	throw new Error("Invalid media type.");
}

export function parsePositiveId(value: string, label: string): number {
	const id = Number(value);

	if (!Number.isInteger(id) || id <= 0) {
		throw new Error(`Invalid ${label} id.`);
	}

	return id;
}

export function getMediaViewTransitionName(
	type: MediaType,
	id: number | string,
	element: MediaViewTransitionElement
): string {
	return `media-${type}-${id}-${element}`;
}

export function getMediaRouteViewTransitionTypes(
	fromPathname: string | undefined,
	toPathname: string
): string[] | false {
	const browseFromMatch = fromPathname?.match(BROWSE_PATH_PATTERN);
	const detailsFromMatch = fromPathname?.match(DETAILS_PATH_PATTERN);
	const browseToMatch = toPathname.match(BROWSE_PATH_PATTERN);
	const detailsToMatch = toPathname.match(DETAILS_PATH_PATTERN);

	if (
		browseFromMatch &&
		detailsToMatch &&
		browseFromMatch[1] === detailsToMatch[1]
	) {
		return ["media-detail-enter"];
	}

	if (
		detailsFromMatch &&
		browseToMatch &&
		detailsFromMatch[1] === browseToMatch[1]
	) {
		return ["media-detail-exit"];
	}

	return false;
}
