import { getSafeRedirectPath } from "@/lib/auth";
import { parseMediaType } from "@/lib/media";
import { getTmdbEpisodePageUrl, getTmdbMediaPageUrl } from "@/lib/tmdb";
import { auth } from "@/server/auth.server";

function buildSignInHref(url: URL): string {
	const nextPath = getSafeRedirectPath(`${url.pathname}${url.search}`);
	const signInUrl = new URL("/sign-in", url.origin);
	signInUrl.searchParams.set("next", nextPath);
	return signInUrl.toString();
}

function parsePositiveIntParam(value: string | null): number | null {
	if (!value) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);

	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

	if (mediaType === "tv") {
		const seasonNumber = parsePositiveIntParam(url.searchParams.get("season"));
		const episodeNumber = parsePositiveIntParam(
			url.searchParams.get("episode")
		);

		if (seasonNumber !== null && episodeNumber !== null) {
			return Response.redirect(
				getTmdbEpisodePageUrl(mediaId, seasonNumber, episodeNumber),
				302
			);
		}
	}

	return Response.redirect(getTmdbMediaPageUrl(mediaType, mediaId), 302);
}
