import { createFileRoute } from "@tanstack/react-router";

import RecommendationsPage from "@/components/recommendations/page";

export const Route = createFileRoute("/recommendations/")({
	component: RecommendationsPage,
	head: () => ({
		meta: [
			{
				title: "Recommendations | Films",
			},
		],
	}),
});
