import MediaGrid from "@/components/media/grid";
import type { BrowseView } from "@/lib/media";
import type { ShowResponse } from "@/lib/tmdb";

export default function TVShowsGrid({
	data,
	searchQuery,
	view,
}: {
	data: ShowResponse;
	searchQuery: string;
	view: BrowseView;
}) {
	return (
		<MediaGrid
			data={data}
			mediaLabel={view === "discover" ? "shows" : `${view} shows`}
			resolveItemType={() => "tv"}
			searchQuery={searchQuery}
			view={view}
		/>
	);
}
