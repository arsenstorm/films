import { createFileRoute } from "@tanstack/react-router";

import RecommendationsPage from "@/components/recommendations/page";
import { requireSpecialUserAccess } from "@/server/auth";

export const Route = createFileRoute("/recommendations")({
	beforeLoad: async () => {
		await requireSpecialUserAccess("/recommendations");
	},
	component: RecommendationsPage,
	head: () => ({
		meta: [
			{
				title: "Recommendations | Films",
			},
		],
	}),
});
