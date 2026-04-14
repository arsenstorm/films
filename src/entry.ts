/**
 * Worker-level request handling for health checks and lightweight redirects
 * before handing off to TanStack Start.
 */
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import type { MediaType } from "@/lib/media";
import { handleHealthCheckRequest } from "@/server/worker/health-check.server";

const HEALTH_CHECK_PATH = "/health";
const MEDIA_ACTION_PATH_PATTERN = /^\/(movies|tv)\/([^/]+)\/([^/]+)\/?$/;
const WATCH_ACTION = "watch";

interface MediaRedirectRouteMatch {
	action: string;
	id: string;
	type: MediaType;
}

function matchHealthCheckRequest(request: Request): boolean {
	if (request.method !== "GET") {
		return false;
	}

	return new URL(request.url).pathname === HEALTH_CHECK_PATH;
}

function matchMediaRequest(request: Request): MediaRedirectRouteMatch | null {
	if (request.method !== "GET") {
		return null;
	}

	const url = new URL(request.url);
	const routeMatch = url.pathname.match(MEDIA_ACTION_PATH_PATTERN);

	if (!routeMatch) {
		return null;
	}

	const [, type, id, action] = routeMatch;

	return {
		id,
		type: type === "movies" ? "movies" : "tv",
		action,
	};
}

async function dispatchMediaRedirectRequest(
	match: MediaRedirectRouteMatch,
	request: Request
): Promise<Response> {
	const { handleMediaRedirectRequest } = await import(
		"@/server/worker/media-redirect.server"
	);

	return handleMediaRedirectRequest({
		id: match.id,
		request,
		type: match.type,
	});
}

function handleWorkerRequest(
	request: Request
): Promise<Response> | Response | null {
	if (matchHealthCheckRequest(request)) {
		return handleHealthCheckRequest();
	}

	const mediaRedirectMatch = matchMediaRequest(request);

	if (mediaRedirectMatch && mediaRedirectMatch.action === WATCH_ACTION) {
		return dispatchMediaRedirectRequest(mediaRedirectMatch, request);
	}

	return null;
}

export default createServerEntry({
	async fetch(request) {
		const workerResponse = await handleWorkerRequest(request);

		if (workerResponse) {
			return workerResponse;
		}

		return handler.fetch(request);
	},
});
