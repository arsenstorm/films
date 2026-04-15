import MediaGrid from "@/components/media/grid";
import { fetchShows } from "@/lib/browse";
import type { BrowseView } from "@/lib/media";

export default function TVShowsGrid({
	page,
	searchQuery,
	view,
}: {
	page: number;
	searchQuery: string;
	view: BrowseView;
}) {
	return (
		<MediaGrid
			browseType="tv"
			fetchItems={fetchShows}
			mediaLabel={view === "discover" ? "shows" : `${view} shows`}
			page={page}
			resolveItemType={() => "tv"}
			searchQuery={searchQuery}
			view={view}
		/>
	);
}
