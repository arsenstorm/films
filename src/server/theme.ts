import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

import {
	parseTheme,
	THEME_COOKIE_MAX_AGE,
	THEME_COOKIE_NAME,
	type Theme,
} from "@/lib/theme";

interface ThemeInput {
	theme: Theme;
}

function validateThemeInput(data: unknown): ThemeInput {
	if (!(data && typeof data === "object")) {
		return {
			theme: "dark",
		};
	}

	const input = data as Partial<ThemeInput>;

	return {
		theme: parseTheme(input.theme),
	};
}

export const getThemeFn = createServerFn({ method: "GET" }).handler(() => {
	return {
		theme: parseTheme(getCookie(THEME_COOKIE_NAME)),
	};
});

export const setThemeFn = createServerFn({ method: "POST" })
	.inputValidator(validateThemeInput)
	.handler(({ data }) => {
		setCookie(THEME_COOKIE_NAME, data.theme, {
			maxAge: THEME_COOKIE_MAX_AGE,
			path: "/",
			sameSite: "lax",
		});

		return {
			theme: data.theme,
		};
	});
