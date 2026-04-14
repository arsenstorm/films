export type AuthFormMode = "sign-in" | "sign-up";

export const DEFAULT_AUTHENTICATED_PATH = "/movies";
export const DEFAULT_SIGN_IN_SEARCH = {
	next: DEFAULT_AUTHENTICATED_PATH,
} as const;

const REDIRECT_FALLBACK_PATH = "/";

export function getSafeRedirectPath(value: string | null | undefined): string {
	if (!(value?.startsWith("/") && !value.startsWith("//"))) {
		return REDIRECT_FALLBACK_PATH;
	}

	return value;
}

export function getAuthErrorMessage(mode: AuthFormMode): string {
	if (mode === "sign-up") {
		return "We couldn't create your account. Check your details and try again.";
	}

	return "The email or password did not match. Try again.";
}

export interface SignInSearch {
	next: string;
}

export function parseSignInSearch(
	search: Record<string, unknown>
): SignInSearch {
	return {
		next:
			typeof search.next === "string"
				? getSafeRedirectPath(search.next)
				: DEFAULT_SIGN_IN_SEARCH.next,
	};
}
