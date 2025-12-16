import { z } from "zod";
import type { StorageProvider } from "./types.js";
import { LocalStorageProvider, LocalStorageConfigSchema } from "./local.js";
import { S3StorageProvider, S3StorageConfigSchema } from "./s3.js";
import { GoogleDriveStorageProvider, GoogleDriveStorageConfigSchema } from "./google-drive.js";
import { SlackStorageProvider, SlackStorageConfigSchema } from "./slack.js";

export type { StorageProvider, StoreFileInput, StorageResult } from "./types.js";
export { LocalStorageProvider, LocalStorageConfigSchema } from "./local.js";
export { S3StorageProvider, S3StorageConfigSchema } from "./s3.js";
export { GoogleDriveStorageProvider, GoogleDriveStorageConfigSchema } from "./google-drive.js";
export { SlackStorageProvider, SlackStorageConfigSchema } from "./slack.js";

/**
 * Union schema for all storage configurations.
 */
export const StorageConfigSchema = z.discriminatedUnion("type", [
  LocalStorageConfigSchema.extend({ type: z.literal("local") }),
  S3StorageConfigSchema.extend({ type: z.literal("s3") }),
  GoogleDriveStorageConfigSchema.extend({ type: z.literal("google-drive") }),
  SlackStorageConfigSchema.extend({ type: z.literal("slack") }),
]);

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

/**
 * Creates a storage provider from configuration.
 *
 * @param config - Storage configuration with type discriminator
 * @returns Configured storage provider
 *
 * @example
 * ```typescript
 * const storage = createStorageProvider({
 *   type: "s3",
 *   bucket: "my-bucket",
 *   region: "eu-west-1",
 * });
 *
 * await storage.store({
 *   content: buffer,
 *   filename: "diagram.svg",
 * });
 * ```
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  const parsed = StorageConfigSchema.parse(config);

  switch (parsed.type) {
    case "local":
      return new LocalStorageProvider(parsed);

    case "s3":
      return new S3StorageProvider(parsed);

    case "google-drive":
      return new GoogleDriveStorageProvider(parsed);

    case "slack":
      return new SlackStorageProvider(parsed);

    default: {
      const exhaustiveCheck: never = parsed;
      throw new Error(`Unknown storage type: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

/**
 * List of all supported storage provider types.
 */
export const STORAGE_TYPES = ["local", "s3", "google-drive", "slack"] as const;
export type StorageType = (typeof STORAGE_TYPES)[number];
