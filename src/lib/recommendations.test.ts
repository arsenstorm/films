import { describe, expect, it } from "vitest";

import {
	getRecommendationsErrorMessage,
	isRecommendationRouteId,
} from "@/lib/recommendations";

describe("recommendation helpers", () => {
	it("identifies recommendation routes and formats fallback errors", () => {
		expect(isRecommendationRouteId("/recommendations/")).toBe(true);
		expect(isRecommendationRouteId("/recommendations/all")).toBe(true);
		expect(isRecommendationRouteId("/movies")).toBe(false);
		expect(getRecommendationsErrorMessage(new Error("Failed"))).toBe("Failed");
		expect(getRecommendationsErrorMessage("failure")).toBe(
			"Something went wrong while loading your recommendation."
		);
	});
});
