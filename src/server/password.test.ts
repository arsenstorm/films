import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/server/password";

describe("hashPassword", () => {
	it("creates distinct hashes for the same password", async () => {
		const password = "correct horse battery staple";
		const firstHash = await hashPassword(password);
		const secondHash = await hashPassword(password);

		expect(firstHash).not.toBe(secondHash);
	});
});

describe("verifyPassword", () => {
	it("accepts the original password", async () => {
		const password = "correct horse battery staple";
		const hash = await hashPassword(password);

		await expect(verifyPassword({ hash, password })).resolves.toBe(true);
	});

	it("rejects the wrong password", async () => {
		const hash = await hashPassword("correct horse battery staple");

		await expect(
			verifyPassword({
				hash,
				password: "Tr0ub4dor&3",
			})
		).resolves.toBe(false);
	});

	it("rejects malformed hashes", async () => {
		await expect(
			verifyPassword({
				hash: "not-a-valid-hash",
				password: "correct horse battery staple",
			})
		).resolves.toBe(false);
	});
});
