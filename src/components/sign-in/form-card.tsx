import type { FormEventHandler } from "react";

import type { AuthFormMode } from "@/lib/auth";

interface SignInFormCardProps {
	formError: string | null;
	isSubmitting: boolean;
	mode: AuthFormMode;
	nextPath: string;
	onModeChange: (mode: AuthFormMode) => void;
	onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function SignInFormCard({
	formError,
	isSubmitting,
	mode,
	nextPath,
	onModeChange,
	onSubmit,
}: SignInFormCardProps) {
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
		<section className="w-full max-w-md rounded-3xl bg-white/96 p-6 shadow-[0_32px_120px_rgba(24,24,27,0.14)] backdrop-blur-sm lg:p-8 dark:bg-zinc-900/94 dark:shadow-[0_32px_120px_rgba(0,0,0,0.48)]">
			<div className="inline-flex rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-950">
				<button
					className={`rounded-xl px-4 py-2 font-medium text-sm transition-colors ${signInTabClass}`}
					onClick={() => {
						onModeChange("sign-in");
					}}
					type="button"
				>
					Sign in
				</button>
				<button
					className={`rounded-xl px-4 py-2 font-medium text-sm transition-colors ${signUpTabClass}`}
					onClick={() => {
						onModeChange("sign-up");
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

			<form className="mt-8 space-y-5" onSubmit={onSubmit}>
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
	);
}
