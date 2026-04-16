import {
	createFileRoute,
	type ErrorComponentProps,
	useRouter,
} from "@tanstack/react-router";

import RecommendationsAllPage, {
	getRecommendationsAllErrorMessage,
	RecommendationsAllErrorState,
	RecommendationsAllLoadingState,
} from "@/components/recommendations/all-page";
import { getRecommendationReviewFn } from "@/server/recommendations";

export const Route = createFileRoute("/recommendations/all")({
	component: RecommendationsAllRoute,
	errorComponent: RecommendationsAllRouteError,
	head: () => ({
		meta: [
			{
				title: "Recommendations | Films",
			},
		],
	}),
	loader: async () => getRecommendationReviewFn(),
	pendingComponent: RecommendationsAllLoadingState,
	ssr: "data-only",
});

function RecommendationsAllRoute() {
	const data = Route.useLoaderData();

	return <RecommendationsAllPage data={data} />;
}

function RecommendationsAllRouteError({ error }: ErrorComponentProps) {
	const router = useRouter();

	return (
		<RecommendationsAllErrorState
			errorMessage={getRecommendationsAllErrorMessage(error)}
			onRetry={async () => {
				await router.invalidate();
			}}
		/>
	);
}
