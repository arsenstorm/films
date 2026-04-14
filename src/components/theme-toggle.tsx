import clsx from "clsx";
import { Moon, SunMedium } from "lucide-react";

import type { Theme } from "@/lib/theme";

interface ThemeToggleProps {
	className?: string;
	isPending: boolean;
	onThemeChange: (theme: Theme) => void;
	theme: Theme;
}

export default function ThemeToggle({
	className,
	isPending,
	onThemeChange,
	theme,
}: ThemeToggleProps) {
	const nextTheme = theme === "dark" ? "light" : "dark";
	const Icon = nextTheme === "dark" ? Moon : SunMedium;
	const defaultClassName = clsx(
		"relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/82 text-zinc-500 ring-1 ring-black/5 backdrop-blur-md transition-[background-color,color,transform,box-shadow] hover:bg-white hover:text-zinc-950 hover:ring-black/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-950/82 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-zinc-950 dark:hover:text-zinc-100 dark:hover:ring-white/16",
		theme === "dark" && "dark:ring-white/12"
	);

	return (
		<button
			aria-label={
				nextTheme === "dark" ? "Switch to dark theme" : "Switch to light theme"
			}
			aria-pressed={theme === "dark"}
			className={className ?? defaultClassName}
			disabled={isPending}
			onClick={() => {
				onThemeChange(nextTheme);
			}}
			type="button"
		>
			<span
				aria-hidden="true"
				className="absolute top-1/2 left-1/2 pointer-fine:hidden size-[max(100%,3rem)] -translate-x-1/2 -translate-y-1/2"
			/>
			<Icon className="size-4.5" />
		</button>
	);
}
