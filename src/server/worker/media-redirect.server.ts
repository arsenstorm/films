import { getSafeRedirectPath } from "@/lib/auth";
import { parseMediaType } from "@/lib/media";
import { getTmdbMediaPageUrl } from "@/lib/tmdb";
import { auth } from "@/server/auth.server";

function buildSignInHref(url: URL): string {
	const nextPath = getSafeRedirectPath(`${url.pathname}${url.search}`);
	const signInUrl = new URL("/sign-in", url.origin);
	signInUrl.searchParams.set("next", nextPath);
	return signInUrl.toString();
}

interface HandleMediaRedirectRequestInput {
	id: string;
	request: Request;
	type: string;
}

export async function handleMediaRedirectRequest({
	id,
	request,
	type,
}: HandleMediaRedirectRequestInput): Promise<Response> {
	const mediaId = Number.parseInt(id, 10);
	const mediaType = parseMediaType(type);

	if (Number.isNaN(mediaId)) {
		throw new Error("Invalid media ID.");
	}

	const url = new URL(request.url);
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session) {
		return Response.redirect(buildSignInHref(url), 302);
	}

	return Response.redirect(getTmdbMediaPageUrl(mediaType, mediaId), 302);
}
