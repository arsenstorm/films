import { createFileRoute } from "@tanstack/react-router";

import RecommendationsAllPage from "@/components/recommendations/all-page";

export const Route = createFileRoute("/recommendations/all")({
	component: RecommendationsAllPage,
	head: () => ({
		meta: [
			{
				title: "All Recommendations | Films",
			},
		],
	}),
});
