import { type FormEvent, useState } from "react";

import { type AuthFormMode, getAuthErrorMessage } from "@/lib/auth";
import type { Movie } from "@/lib/tmdb";
import { signInFn, signUpFn } from "@/server/auth";

import SignInFormCard from "./form-card";
import MovieMarquee from "./movie-marquee";

interface SignInPageProps {
	nextPath: string;
	popularMovies: Movie[];
}

export default function SignInPage({
	nextPath,
	popularMovies,
}: SignInPageProps) {
	const [mode, setMode] = useState<AuthFormMode>("sign-in");
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function handleModeChange(nextMode: AuthFormMode): void {
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

	return (
		<main className="relative min-h-screen overflow-hidden bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
			{popularMovies.length > 0 ? (
				<MovieMarquee movies={popularMovies} />
			) : null}
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,244,245,0.36),rgba(244,244,245,0.82)_46%,rgba(244,244,245,0.97)_72%)] dark:bg-[radial-gradient(circle_at_center,rgba(24,24,27,0.18),rgba(9,9,11,0.78)_44%,rgba(9,9,11,0.96)_72%)]" />
			<div className="relative z-10 flex min-h-screen items-center justify-center p-6">
				<SignInFormCard
					formError={formError}
					isSubmitting={isSubmitting}
					mode={mode}
					nextPath={nextPath}
					onModeChange={handleModeChange}
					onSubmit={handleSubmit}
				/>
			</div>
		</main>
	);
}
