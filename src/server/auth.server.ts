import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { joyful } from "joyful";
import { getSafeRedirectPath } from "@/lib/auth";
import { authSchema } from "@/schema";
import { db } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/password";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

interface AuthActionResult {
	error: boolean;
	message?: string;
	nextPath: string;
}

function getAuthErrorDetails(error: unknown): {
	code?: string;
	message?: string;
	status?: number;
} {
	if (!(error && typeof error === "object")) {
		return {};
	}

	const authError = error as {
		code?: unknown;
		message?: unknown;
		status?: unknown;
		statusCode?: unknown;
	};
	let status: number | undefined;

	if (typeof authError.status === "number") {
		status = authError.status;
	} else if (typeof authError.statusCode === "number") {
		status = authError.statusCode;
	}

	return {
		code: typeof authError.code === "string" ? authError.code : undefined,
		message:
			typeof authError.message === "string" ? authError.message : undefined,
		status,
	};
}

function getSignInErrorMessage(error: unknown): string | undefined {
	const { code } = getAuthErrorDetails(error);

	if (code === "INVALID_EMAIL_OR_PASSWORD") {
		return "The email or password did not match. Try again.";
	}

	return undefined;
}

function getSignUpErrorMessage(error: unknown): string | undefined {
	const { code, message } = getAuthErrorDetails(error);

	if (
		code === "USER_ALREADY_EXISTS" ||
		code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
	) {
		return "An account with that email already exists. Sign in instead.";
	}

	if (code === "PASSWORD_TOO_SHORT") {
		return "Your password must be at least 8 characters.";
	}

	if (code === "PASSWORD_TOO_LONG") {
		return "Your password must be 64 characters or fewer.";
	}

	return message;
}

export const auth = betterAuth({
	secret: env.AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: authSchema,
	}),
	emailAndPassword: {
		enabled: true,
		disableSignUp: false,
		maxPasswordLength: 64,
		minPasswordLength: 8,
		password: {
			hash: hashPassword,
			verify: verifyPassword,
		},
	},
	session: {
		expiresIn: SESSION_MAX_AGE,
	},
	plugins: [
		tanstackStartCookies(),
		customSession(async ({ user, session }) => {
			const [userData] =
				(await db
					.select({
						special: authSchema.user.special,
					})
					.from(authSchema.user)
					.where(eq(authSchema.user.id, user.id))
					.limit(1)) ?? [];

			if (!userData) {
				return {
					user: {
						...user,
						special: false,
					},
					session,
				};
			}

			return {
				user: {
					...user,
					// For future use as a manual override flag
					special: userData.special,
				},
				session,
			};
		}),
	],
});

export function getServerSession() {
	return auth.api.getSession({
		headers: getRequest().headers,
	});
}

export async function isAuthenticatedRequest(): Promise<boolean> {
	const session = await getServerSession();
	return session !== null;
}

export async function signInWithEmail(input: {
	email: string;
	nextPath: string;
	password: string;
}): Promise<AuthActionResult> {
	const nextPath = getSafeRedirectPath(input.nextPath);

	try {
		await auth.api.signInEmail({
			body: {
				email: input.email,
				password: input.password,
				rememberMe: true,
			},
			headers: getRequest().headers,
		});

		return {
			error: false,
			nextPath,
		};
	} catch (error) {
		return {
			error: true,
			message: getSignInErrorMessage(error),
			nextPath,
		};
	}
}

export async function signUpWithEmail(input: {
	email: string;
	nextPath: string;
	password: string;
}): Promise<AuthActionResult> {
	const nextPath = getSafeRedirectPath(input.nextPath);
	const generatedName = joyful({
		separator: " ",
	});

	try {
		await auth.api.signUpEmail({
			body: {
				email: input.email,
				name: generatedName,
				password: input.password,
				rememberMe: true,
			},
			headers: getRequest().headers,
		});

		return {
			error: false,
			nextPath,
		};
	} catch (error) {
		return {
			error: true,
			message: getSignUpErrorMessage(error),
			nextPath,
		};
	}
}
