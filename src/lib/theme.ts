export const THEME_COOKIE_NAME = "films-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = ["light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

export function parseTheme(value: unknown): Theme {
	return value === "light" ? "light" : "dark";
}
