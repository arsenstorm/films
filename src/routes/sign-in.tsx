import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import SignInPage from "@/components/sign-in/page";
import { DEFAULT_SIGN_IN_SEARCH, parseSignInSearch } from "@/lib/auth";
import { redirectAuthenticatedUser } from "@/server/auth";
import { getMarqueeMoviesFn } from "@/server/tmdb";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async ({ location }) => {
		const search = parseSignInSearch(
			location.search as Record<string, unknown>
		);
		await redirectAuthenticatedUser(search.next);
	},
	component: SignInRoute,
	head: () => ({
		meta: [
			{
				title: "Sign In | Films",
			},
		],
	}),
	loader: async ({ location }) => {
		const search = parseSignInSearch(
			location.search as Record<string, unknown>
		);
		const popularMovies = await getMarqueeMoviesFn().catch(() => []);

		return {
			nextPath: search.next,
			popularMovies,
		};
	},
	search: {
		middlewares: [stripSearchParams(DEFAULT_SIGN_IN_SEARCH)],
	},
	validateSearch: parseSignInSearch,
});

function SignInRoute() {
	const { nextPath, popularMovies } = Route.useLoaderData();

	return <SignInPage nextPath={nextPath} popularMovies={popularMovies} />;
}
