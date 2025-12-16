import { z } from "zod";

/**
 * Zod schema for storage operation input.
 */
export const StoreFileInputSchema = z.object({
  /** File content as a Buffer or base64 string. */
  content: z.union([z.instanceof(Buffer), z.string()]),

  /** Filename to use for storage. */
  filename: z.string().min(1),

  /** MIME type of the content. */
  mimeType: z.string().optional(),

  /** Additional metadata to store with the file. */
  metadata: z.record(z.unknown()).optional(),
});

export type StoreFileInput = z.infer<typeof StoreFileInputSchema>;

/**
 * Zod schema for storage result.
 */
export const StorageResultSchema = z.object({
  /** Provider-specific location identifier (path, URL, etc.). */
  location: z.string(),

  /** Public URL if available. */
  publicUrl: z.string().optional(),

  /** Additional metadata from the storage provider. */
  metadata: z.record(z.unknown()).optional(),
});

export type StorageResult = z.infer<typeof StorageResultSchema>;

/**
 * Interface for storage provider implementations.
 */
export interface StorageProvider {
  /** Provider type identifier. */
  readonly type: string;

  /**
   * Stores a file and returns the storage result.
   *
   * @param input - File content and metadata to store
   * @returns Storage result with location information
   */
  store(input: StoreFileInput): Promise<StorageResult>;

  /**
   * Checks if the provider is properly configured and can be used.
   *
   * @returns True if the provider is ready to use
   */
  isConfigured(): boolean;
}
