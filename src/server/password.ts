const HASH_ALGORITHM = "PBKDF2";
const HASH_DIGEST = "SHA-256";
const HASH_ITERATIONS = 100_000;
const HASH_KEY_LENGTH = 32;
const HASH_SALT_LENGTH = 16;
const HASH_VERSION = "pbkdf2_sha256_v1";
const HASH_SEGMENT_COUNT = 4;

function createSalt(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(HASH_SALT_LENGTH));
}

function toBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	return new Uint8Array(bytes);
}

function encodeBase64Url(bytes: Uint8Array): string {
	const base64 = btoa(String.fromCharCode(...bytes));

	return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): Uint8Array | null {
	const paddingLength = (4 - (value.length % 4)) % 4;
	const base64 = value
		.replaceAll("-", "+")
		.replaceAll("_", "/")
		.concat("=".repeat(paddingLength));

	try {
		const decoded = atob(base64);
		const bytes = new Uint8Array(decoded.length);

		for (const [index, character] of Array.from(decoded).entries()) {
			bytes[index] = character.charCodeAt(0);
		}

		return bytes;
	} catch {
		return null;
	}
}

async function derivePasswordBits(
	password: string,
	salt: Uint8Array,
	iterations: number
): Promise<Uint8Array> {
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		HASH_ALGORITHM,
		false,
		["deriveBits"]
	);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			hash: HASH_DIGEST,
			iterations,
			name: HASH_ALGORITHM,
			salt: toBufferSource(salt),
		},
		keyMaterial,
		HASH_KEY_LENGTH * 8
	);

	return new Uint8Array(derivedBits);
}

function parseStoredHash(hash: string): {
	hashBytes: Uint8Array;
	iterations: number;
	salt: Uint8Array;
} | null {
	const segments = hash.split("$");

	if (segments.length !== HASH_SEGMENT_COUNT) {
		return null;
	}

	const [version, iterationsValue, saltValue, hashValue] = segments;

	if (version !== HASH_VERSION) {
		return null;
	}

	const iterations = Number(iterationsValue);

	if (!Number.isInteger(iterations) || iterations <= 0) {
		return null;
	}

	const salt = decodeBase64Url(saltValue);
	const hashBytes = decodeBase64Url(hashValue);

	if (!(salt && hashBytes)) {
		return null;
	}

	return {
		hashBytes,
		iterations,
		salt,
	};
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
	if (left.length !== right.length) {
		return false;
	}

	const subtleWithTimingSafeEqual = crypto.subtle as SubtleCrypto & {
		timingSafeEqual?: (
			leftBytes: BufferSource,
			rightBytes: BufferSource
		) => boolean;
	};

	if (typeof subtleWithTimingSafeEqual.timingSafeEqual === "function") {
		return subtleWithTimingSafeEqual.timingSafeEqual(
			toBufferSource(left),
			toBufferSource(right)
		);
	}

	let difference = 0;

	for (const [index, value] of left.entries()) {
		difference += Math.abs(value - right[index]);
	}

	return difference === 0;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = createSalt();
	const hashBytes = await derivePasswordBits(password, salt, HASH_ITERATIONS);

	return `${HASH_VERSION}$${HASH_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(hashBytes)}`;
}

export async function verifyPassword(input: {
	hash: string;
	password: string;
}): Promise<boolean> {
	const parsedHash = parseStoredHash(input.hash);

	if (!parsedHash) {
		return false;
	}

	const actualHash = await derivePasswordBits(
		input.password,
		parsedHash.salt,
		parsedHash.iterations
	);

	return timingSafeEqual(actualHash, parsedHash.hashBytes);
}
