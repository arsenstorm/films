import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { createQueryClient } from "@/lib/query";
import type { Theme } from "@/lib/theme";
import { getThemeFn, setThemeFn } from "@/server/theme";
import appCss from "../styles.css?url";

const THEME_TRANSITION_SUPPRESSION_CLASS = "theme-transition-disabled";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Films",
			},
			{
				name: "description",
				content: "Any film, whenever, anywhere.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	loader: () => {
		return getThemeFn();
	},
	shellComponent: RootDocument,
});

function suppressThemeTransitions(): void {
	const root = document.documentElement;
	root.classList.add(THEME_TRANSITION_SUPPRESSION_CLASS);

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			root.classList.remove(THEME_TRANSITION_SUPPRESSION_CLASS);
		});
	});
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const { theme } = Route.useLoaderData();
	const [currentTheme, setCurrentTheme] = useState(theme);
	const [isPending, setIsPending] = useState(false);
	const [queryClient] = useState(createQueryClient);

	useEffect(() => {
		setCurrentTheme(theme);
	}, [theme]);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", currentTheme === "dark");
		document.documentElement.dataset.theme = currentTheme;
	}, [currentTheme]);

	async function handleThemeChange(nextTheme: Theme): Promise<void> {
		if (nextTheme === currentTheme || isPending) {
			return;
		}

		const previousTheme = currentTheme;
		suppressThemeTransitions();
		setCurrentTheme(nextTheme);
		setIsPending(true);

		try {
			await setThemeFn({
				data: {
					theme: nextTheme,
				},
			});
		} catch {
			suppressThemeTransitions();
			setCurrentTheme(previousTheme);
		} finally {
			setIsPending(false);
		}
	}

	return (
		<html
			className={currentTheme === "dark" ? "dark" : undefined}
			data-theme={currentTheme}
			lang="en"
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body className="transition-colors duration-200">
				<QueryClientProvider client={queryClient}>
					<ThemeProvider
						value={{
							isPending,
							setTheme: handleThemeChange,
							theme: currentTheme,
						}}
					>
						{children}
					</ThemeProvider>
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	);
}
