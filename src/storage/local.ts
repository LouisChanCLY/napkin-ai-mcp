import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import { StorageProvider, StoreFileInput, StorageResult } from "./types.js";

/**
 * Zod schema for local storage configuration.
 */
export const LocalStorageConfigSchema = z.object({
  /** Directory path to store files. */
  directory: z.string().min(1),
});

export type LocalStorageConfig = z.infer<typeof LocalStorageConfigSchema>;

/**
 * Storage provider that saves files to the local filesystem.
 *
 * @example
 * ```typescript
 * const storage = new LocalStorageProvider({ directory: "./output" });
 *
 * const result = await storage.store({
 *   content: Buffer.from("<svg>...</svg>"),
 *   filename: "diagram.svg",
 *   mimeType: "image/svg+xml",
 * });
 *
 * console.log(result.location); // "./output/diagram.svg"
 * ```
 */
export class LocalStorageProvider implements StorageProvider {
  readonly type = "local";
  private readonly directory: string;

  constructor(config: LocalStorageConfig) {
    const parsed = LocalStorageConfigSchema.parse(config);
    this.directory = resolve(parsed.directory);
  }

  async store(input: StoreFileInput): Promise<StorageResult> {
    // Always attempt to create directory - mkdir with recursive:true is idempotent
    try {
      await mkdir(this.directory, { recursive: true });
    } catch (err) {
      const error = err as Error & { code?: string };
      // Only throw if it's not an "already exists" error
      if (error.code !== "EEXIST") {
        throw new Error(`Failed to create storage directory "${this.directory}": ${error.message}`);
      }
    }

    const filePath = join(this.directory, input.filename);
    const content = Buffer.isBuffer(input.content)
      ? input.content
      : Buffer.from(input.content, "base64");

    await writeFile(filePath, content);

    return {
      location: filePath,
      metadata: {
        directory: this.directory,
        filename: input.filename,
        size: content.length,
      },
    };
  }

  isConfigured(): boolean {
    return Boolean(this.directory);
  }
}
