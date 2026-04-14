import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import MovieMarquee from "@/components/sign-in/movie-marquee";
import {
	type AuthFormMode,
	DEFAULT_SIGN_IN_SEARCH,
	getAuthErrorMessage,
	parseSignInSearch,
} from "@/lib/auth";
import { redirectAuthenticatedUser, signInFn, signUpFn } from "@/server/auth";
import { getMarqueeMoviesFn } from "@/server/tmdb";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async ({ location }) => {
		const search = parseSignInSearch(
			location.search as Record<string, unknown>
		);
		await redirectAuthenticatedUser(search.next);
	},
	component: SignInPage,
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

function SignInPage() {
	const { nextPath, popularMovies } = Route.useLoaderData();
	const [mode, setMode] = useState<AuthFormMode>("sign-in");
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function resetForMode(nextMode: AuthFormMode): void {
		setMode(nextMode);
		setFormError(null);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isSubmitting) {
			return;
		}

		const formData = new FormData(event.currentTarget);
		const email = formData.get("email");
		const password = formData.get("password");

		if (!(typeof email === "string" && typeof password === "string")) {
			setFormError("Unable to continue right now. Try again.");
			return;
		}

		setFormError(null);
		setIsSubmitting(true);

		try {
			const result =
				mode === "sign-up"
					? await signUpFn({
							data: {
								email,
								nextPath,
								password,
							},
						})
					: await signInFn({
							data: {
								email,
								nextPath,
								password,
							},
						});

			if (result.error) {
				setFormError(result.message ?? getAuthErrorMessage(mode));
				setIsSubmitting(false);
				return;
			}

			window.location.assign(result.nextPath);
		} catch (error) {
			setFormError(
				error instanceof Error
					? error.message
					: "Unable to continue right now. Try again."
			);
			setIsSubmitting(false);
		}
	}

	const isSignUp = mode === "sign-up";
	const signInTabClass = isSignUp
		? "text-zinc-500 dark:text-zinc-400"
		: "bg-white text-zinc-950 shadow-sm dark:bg-zinc-200 dark:text-zinc-950";
	const signUpTabClass = isSignUp
		? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-200 dark:text-zinc-950"
		: "text-zinc-500 dark:text-zinc-400";
	const passwordPlaceholder = isSignUp
		? "Create a password"
		: "Enter your password";
	let submitLabel = "Enter Films";

	if (isSubmitting && isSignUp) {
		submitLabel = "Creating account...";
	} else if (isSubmitting) {
		submitLabel = "Entering...";
	} else if (isSignUp) {
		submitLabel = "Create account";
	}

	return (
		<main className="relative min-h-screen overflow-hidden bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
			{popularMovies.length > 0 ? (
				<MovieMarquee movies={popularMovies} />
			) : null}
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,244,245,0.36),rgba(244,244,245,0.82)_46%,rgba(244,244,245,0.97)_72%)] dark:bg-[radial-gradient(circle_at_center,rgba(24,24,27,0.18),rgba(9,9,11,0.78)_44%,rgba(9,9,11,0.96)_72%)]" />
			<div className="relative z-10 flex min-h-screen items-center justify-center p-6">
				<section className="w-full max-w-md rounded-3xl bg-white/96 p-6 shadow-[0_32px_120px_rgba(24,24,27,0.14)] backdrop-blur-sm lg:p-8 dark:bg-zinc-900/94 dark:shadow-[0_32px_120px_rgba(0,0,0,0.48)]">
					<div className="inline-flex rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-950">
						<button
							className={`rounded-xl px-4 py-2 font-medium text-sm transition-colors ${signInTabClass}`}
							onClick={() => {
								resetForMode("sign-in");
							}}
							type="button"
						>
							Sign in
						</button>
						<button
							className={`rounded-xl px-4 py-2 font-medium text-sm transition-colors ${signUpTabClass}`}
							onClick={() => {
								resetForMode("sign-up");
							}}
							type="button"
						>
							Sign up
						</button>
					</div>

					<h2 className="mt-4 font-medium text-3xl tracking-[-0.03em]">
						{isSignUp ? "Create your Films account" : "Sign in to Films"}
					</h2>

					<p className="mt-4 text-base text-zinc-600 leading-7 dark:text-zinc-300">
						{isSignUp
							? "Create an account to start building your watchlist. We'll generate a name for you."
							: "Enter your email and password to sign in to your account."}
					</p>

					<form className="mt-8 space-y-5" onSubmit={handleSubmit}>
						<input name="next" type="hidden" value={nextPath} />

						<label className="block">
							<span className="mb-2 block font-medium text-sm text-zinc-700 dark:text-zinc-200">
								Email
							</span>
							<input
								autoComplete="email"
								className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-base text-zinc-950 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:ring-4 focus:ring-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-700 dark:focus:bg-zinc-900 dark:focus:ring-zinc-800/80 dark:placeholder:text-zinc-500"
								data-1p-ignore
								data-lpignore="true"
								name="email"
								placeholder="Enter your email"
								required
								spellCheck={false}
								type="email"
							/>
						</label>

						<label className="block">
							<span className="mb-2 block font-medium text-sm text-zinc-700 dark:text-zinc-200">
								Password
							</span>
							<input
								autoComplete={isSignUp ? "new-password" : "current-password"}
								className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-base text-zinc-950 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:ring-4 focus:ring-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-700 dark:focus:bg-zinc-900 dark:focus:ring-zinc-800/80 dark:placeholder:text-zinc-500"
								name="password"
								placeholder={passwordPlaceholder}
								required
								type="password"
							/>
						</label>

						<button
							className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 py-3 font-medium text-base text-white transition-[background-color,transform] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-950 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300"
							disabled={isSubmitting}
							type="submit"
						>
							{submitLabel}
						</button>
					</form>

					{formError ? (
						<p
							className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm leading-6 dark:border-red-950 dark:bg-red-950/40 dark:text-red-200"
							role="alert"
						>
							{formError}
						</p>
					) : null}
				</section>
			</div>
		</main>
	);
}
