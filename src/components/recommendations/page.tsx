import { useRecommendationsController } from "@/components/recommendations/use-recommendations-controller";
import type { RecommendationBatchResult } from "@/server/recommendations";

import {
	RecommendationsEmptyState,
	RecommendationsErrorState,
	RecommendationsLoadingState,
	RecommendationViewport,
} from "./page-ui";

export default function RecommendationsPage({
	data,
}: {
	data: RecommendationBatchResult | null;
}) {
	const controller = useRecommendationsController({ data });

	if (controller.isLoading) {
		return <RecommendationsLoadingState />;
	}

	if (controller.loadError && !controller.currentRecommendation) {
		return (
			<RecommendationsErrorState
				errorMessage={controller.loadError}
				onRetry={controller.retry}
			/>
		);
	}

	if (!controller.currentRecommendation) {
		return <RecommendationsEmptyState />;
	}

	return <RecommendationViewport controller={controller} />;
}
