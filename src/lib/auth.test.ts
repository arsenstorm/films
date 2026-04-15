import { describe, expect, it } from "vitest";

import {
	getAuthErrorMessage,
	getSafeRedirectPath,
	parseSignInSearch,
} from "@/lib/auth";

describe("getAuthErrorMessage", () => {
	it("returns the sign in error message", () => {
		expect(getAuthErrorMessage("sign-in")).toBe(
			"The email or password did not match. Try again."
		);
	});

	it("returns the sign up error message", () => {
		expect(getAuthErrorMessage("sign-up")).toBe(
			"We couldn't create your account. Check your details and try again."
		);
	});
});

describe("getSafeRedirectPath", () => {
	it("preserves internal redirects and rejects external ones", () => {
		expect(getSafeRedirectPath("/tv?q=severance")).toBe("/tv?q=severance");
		expect(getSafeRedirectPath("https://example.com")).toBe("/");
		expect(getSafeRedirectPath("//example.com")).toBe("/");
		expect(getSafeRedirectPath(undefined)).toBe("/");
	});
});

describe("parseSignInSearch", () => {
	it("defaults to the authenticated landing page", () => {
		expect(parseSignInSearch({})).toEqual({
			next: "/all",
		});
	});

	it("preserves safe internal redirects and sanitizes unsafe ones", () => {
		expect(parseSignInSearch({ next: "/tv?q=severance" })).toEqual({
			next: "/tv?q=severance",
		});
		expect(parseSignInSearch({ next: "https://example.com" })).toEqual({
			next: "/",
		});
	});
});
