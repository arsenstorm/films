import MediaGrid from "@/components/media/grid";
import { fetchMovies } from "@/lib/browse";
import type { BrowseView } from "@/lib/media";

export default function MoviesGrid({
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
			browseType="movies"
			fetchItems={fetchMovies}
			mediaLabel={view === "discover" ? "movies" : `${view} movies`}
			page={page}
			resolveItemType={() => "movies"}
			searchQuery={searchQuery}
			view={view}
		/>
	);
}
