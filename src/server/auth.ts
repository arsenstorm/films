import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { getSafeRedirectPath } from "@/lib/auth";

let cachedAuthenticatedAccess: boolean | null = null;

interface SignInInput {
	email: string;
	nextPath: string;
	password: string;
}

interface SignUpInput extends SignInInput {}

function validateSignInInput(data: unknown): SignInInput {
	if (!(data && typeof data === "object")) {
		return {
			email: "",
			nextPath: "/",
			password: "",
		};
	}

	const input = data as Partial<SignInInput>;

	return {
		email: typeof input.email === "string" ? input.email : "",
		nextPath:
			typeof input.nextPath === "string"
				? input.nextPath
				: getSafeRedirectPath("/"),
		password: typeof input.password === "string" ? input.password : "",
	};
}

function validateSignUpInput(data: unknown): SignUpInput {
	if (!(data && typeof data === "object")) {
		return {
			email: "",
			nextPath: "/",
			password: "",
		};
	}

	const input = data as Partial<SignUpInput>;

	return {
		email: typeof input.email === "string" ? input.email : "",
		nextPath:
			typeof input.nextPath === "string"
				? input.nextPath
				: getSafeRedirectPath("/"),
		password: typeof input.password === "string" ? input.password : "",
	};
}

export const getSessionStateFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { isAuthenticatedRequest } = await import("@/server/auth.server");

		return {
			isAuthenticated: await isAuthenticatedRequest(),
		};
	}
);

export const signInFn = createServerFn({ method: "POST" })
	.inputValidator(validateSignInInput)
	.handler(async ({ data }) => {
		const { signInWithEmail } = await import("@/server/auth.server");

		return signInWithEmail(data);
	});

export const signUpFn = createServerFn({ method: "POST" })
	.inputValidator(validateSignUpInput)
	.handler(async ({ data }) => {
		const { signUpWithEmail } = await import("@/server/auth.server");

		return signUpWithEmail(data);
	});

export async function requireAuthenticatedAccess(
	nextPath: string
): Promise<void> {
	if (typeof window !== "undefined" && cachedAuthenticatedAccess === true) {
		return;
	}

	const { isAuthenticated } = await getSessionStateFn();

	if (isAuthenticated) {
		if (typeof window !== "undefined") {
			cachedAuthenticatedAccess = true;
		}

		return;
	}

	throw redirect({
		search: {
			next: getSafeRedirectPath(nextPath),
		},
		to: "/sign-in",
	});
}

export async function redirectAuthenticatedUser(
	nextPath: string
): Promise<void> {
	const { isAuthenticated } = await getSessionStateFn();

	if (!isAuthenticated) {
		return;
	}

	throw redirect({
		href: getSafeRedirectPath(nextPath),
	});
}
