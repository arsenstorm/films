const recommendationRouteIds = new Set([
	"/recommendations/",
	"/recommendations/all",
]);

export function getRecommendationsErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: "Something went wrong while loading your recommendation.";
}

export function isRecommendationRouteId(routeId: string): boolean {
	return recommendationRouteIds.has(routeId);
}
