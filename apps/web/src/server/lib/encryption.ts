// ─── AES-256-GCM Encryption for API Keys ────────────────────────────────────
// Uses ENCRYPTION_SECRET from environment as the encryption key.
// Each encrypted value includes a unique IV for security.
// Format: iv:authTag:ciphertext (all hex-encoded)

import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Ensure root .env is loaded (Turbopack may not pass monorepo root vars)
dotenvConfig({ path: resolve(process.cwd(), ".env") });
dotenvConfig({ path: resolve(process.cwd(), "../../.env") });

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is required for API key encryption");
  }
  // Ensure exactly 32 bytes for AES-256
  const key = Buffer.alloc(32);
  Buffer.from(secret, "utf-8").copy(key);
  return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string encrypted with encrypt().
 * Expects format: iv:authTag:ciphertext (all hex-encoded)
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }

  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encrypted = parts[2]!;

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Mask an API key for display (e.g., "abc...xyz")
 * Shows first 3 and last 3 characters.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.substring(0, 3)}${"•".repeat(Math.min(8, key.length - 6))}${key.substring(key.length - 3)}`;
}
