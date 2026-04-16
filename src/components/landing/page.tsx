import { useTheme } from "@/components/theme-provider";
import type { Movie } from "@/lib/tmdb";

import {
	LandingDetailsSection,
	LandingFooter,
	LandingHeroSection,
	LandingMarqueeCtaSection,
} from "./sections";

interface LandingPageProps {
	popularMovies: Movie[];
}

export default function LandingPage({ popularMovies }: LandingPageProps) {
	const { isPending, setTheme, theme } = useTheme();

	return (
		<main className="isolate min-h-dvh overflow-hidden bg-zinc-100 text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-50">
			<LandingHeroSection
				isPending={isPending}
				onThemeChange={setTheme}
				popularMovies={popularMovies}
				theme={theme}
			/>
			<LandingDetailsSection />
			<LandingMarqueeCtaSection popularMovies={popularMovies} />
			<LandingFooter />
		</main>
	);
}
