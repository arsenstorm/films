import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { DEFAULT_AUTHENTICATED_PATH, getSafeRedirectPath } from "@/lib/auth";

interface SessionState {
	isAuthenticated: boolean;
	isSpecialUser: boolean;
}

let cachedSessionState: SessionState | null = null;

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
		const { getSessionState } = await import("@/server/auth.server");
		return getSessionState();
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
): Promise<SessionState> {
	if (typeof window !== "undefined" && cachedSessionState?.isAuthenticated) {
		return cachedSessionState;
	}

	const sessionState = await getSessionStateFn();

	if (sessionState.isAuthenticated) {
		if (typeof window !== "undefined") {
			cachedSessionState = sessionState;
		}

		return sessionState;
	}

	throw redirect({
		search: {
			next: getSafeRedirectPath(nextPath),
		},
		to: "/sign-in",
	});
}

export async function requireSpecialUserAccess(
	nextPath: string
): Promise<void> {
	const sessionState = await getSessionStateFn();

	if (!sessionState.isAuthenticated) {
		throw redirect({
			search: {
				next: getSafeRedirectPath(nextPath),
			},
			to: "/sign-in",
		});
	}

	if (typeof window !== "undefined") {
		cachedSessionState = sessionState;
	}

	if (sessionState.isSpecialUser) {
		return;
	}

	throw redirect({
		href: DEFAULT_AUTHENTICATED_PATH,
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
