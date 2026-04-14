import { describe, expect, it } from "vitest";

import { parseTheme } from "@/lib/theme";

describe("parseTheme", () => {
	it("returns dark for the dark theme", () => {
		expect(parseTheme("dark")).toBe("dark");
	});

	it("returns light for the light theme", () => {
		expect(parseTheme("light")).toBe("light");
	});

	it("falls back to dark for unsupported values", () => {
		expect(parseTheme("system")).toBe("dark");
		expect(parseTheme(undefined)).toBe("dark");
	});
});
