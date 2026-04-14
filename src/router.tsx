import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { getMediaRouteViewTransitionTypes } from "@/lib/media";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultViewTransition: {
			types: ({ fromLocation, toLocation }) =>
				getMediaRouteViewTransitionTypes(
					fromLocation?.pathname,
					toLocation.pathname
				),
		},
		routeTree,
		scrollRestoration: true,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
