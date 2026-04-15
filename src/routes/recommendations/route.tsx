import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireSpecialUserAccess } from "@/server/auth";

export const Route = createFileRoute("/recommendations")({
	beforeLoad: async () => {
		await requireSpecialUserAccess("/recommendations");
	},
	component: Outlet,
});
