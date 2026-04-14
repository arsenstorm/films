import { createContext, useContext } from "react";

import type { Theme } from "@/lib/theme";

interface ThemeContextValue {
	isPending: boolean;
	setTheme: (theme: Theme) => Promise<void>;
	theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
	children,
	value,
}: {
	children: React.ReactNode;
	value: ThemeContextValue;
}) {
	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}

	return context;
}
