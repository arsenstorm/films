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
			fetchItems={fetchMovies}
			mediaLabel={view === "discover" ? "movies" : `${view} movies`}
			page={page}
			searchQuery={searchQuery}
			type="movies"
			view={view}
		/>
	);
}
