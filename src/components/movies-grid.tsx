import MediaGrid from "@/components/media/grid";
import type { BrowseView } from "@/lib/media";
import type { MovieResponse } from "@/lib/tmdb";

export default function MoviesGrid({
	data,
	searchQuery,
	view,
}: {
	data: MovieResponse;
	searchQuery: string;
	view: BrowseView;
}) {
	return (
		<MediaGrid
			data={data}
			mediaLabel={view === "discover" ? "movies" : `${view} movies`}
			resolveItemType={() => "movies"}
			searchQuery={searchQuery}
			view={view}
		/>
	);
}
