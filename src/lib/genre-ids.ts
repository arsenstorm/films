export function parseStoredGenreIds(rawGenreIds: string): number[] {
	try {
		const parsedGenreIds = JSON.parse(rawGenreIds) as unknown;

		if (Array.isArray(parsedGenreIds)) {
			return parsedGenreIds.filter(
				(genreId): genreId is number => typeof genreId === "number"
			);
		}
	} catch {
		return [];
	}

	return [];
}
