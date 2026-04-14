import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

function getRequiredEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export default defineConfig({
	schema: "./src/schema.ts",
	out: "./migrations",
	dialect: "sqlite",
	driver: "d1-http",
	dbCredentials: {
		accountId: getRequiredEnv("CLOUDFLARE_ACCOUNT_ID"),
		databaseId: getRequiredEnv("CLOUDFLARE_DATABASE_ID"),
		token: getRequiredEnv("CLOUDFLARE_D1_TOKEN"),
	},
});
