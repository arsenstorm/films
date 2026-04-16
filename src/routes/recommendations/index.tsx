import {
	createFileRoute,
	type ErrorComponentProps,
	useRouter,
} from "@tanstack/react-router";

import RecommendationsPage from "@/components/recommendations/page";
import {
	RecommendationsErrorState,
	RecommendationsLoadingState,
} from "@/components/recommendations/page-ui";
import { getRecommendationsErrorMessage } from "@/lib/recommendations";
import { getRecommendationFn } from "@/server/recommendations";

export const Route = createFileRoute("/recommendations/")({
	component: RecommendationsRoute,
	errorComponent: RecommendationsRouteError,
	head: () => ({
		meta: [
			{
				title: "Recommendations | Films",
			},
		],
	}),
	loader: async () => getRecommendationFn(),
	pendingComponent: RecommendationsLoadingState,
	ssr: "data-only",
});

function RecommendationsRoute() {
	const data = Route.useLoaderData();

	return <RecommendationsPage data={data} />;
}

function RecommendationsRouteError({ error }: ErrorComponentProps) {
	const router = useRouter();

	return (
		<RecommendationsErrorState
			errorMessage={getRecommendationsErrorMessage(error)}
			onRetry={async () => {
				await router.invalidate();
			}}
		/>
	);
}
