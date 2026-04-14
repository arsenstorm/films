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
			fetchItems={fetchShows}
			mediaLabel={view === "discover" ? "shows" : `${view} shows`}
			page={page}
			searchQuery={searchQuery}
			type="tv"
			view={view}
		/>
	);
}
