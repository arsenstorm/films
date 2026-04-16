import { useState } from "react";

import type { RecommendationReviewResult } from "@/server/recommendations";

import {
	HiddenRecommendationsSection,
	InterestedRecommendationsSection,
	RecommendationsAllEmptyState,
	RecommendationsAllLayout,
} from "./all-page-ui";

export function getRecommendationsAllErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: "Something went wrong while loading recommendation history.";
}

export default function RecommendationsAllPage({
	data,
}: {
	data: RecommendationReviewResult;
}) {
	const [isHiddenOpen, setIsHiddenOpen] = useState(false);
	const hasAnyRecommendations =
		data.newRecommendations.length > 0 ||
		data.interested.length > 0 ||
		data.hidden.length > 0;

	if (!hasAnyRecommendations) {
		return <RecommendationsAllEmptyState />;
	}

	return (
		<RecommendationsAllLayout
			newRecommendationsCount={data.newRecommendations.length}
		>
			<InterestedRecommendationsSection
				hasNewRecommendations={data.newRecommendations.length > 0}
				items={data.interested}
			/>
			<HiddenRecommendationsSection
				isOpen={isHiddenOpen}
				items={data.hidden}
				onToggle={() => {
					setIsHiddenOpen((currentState) => !currentState);
				}}
			/>
		</RecommendationsAllLayout>
	);
}
