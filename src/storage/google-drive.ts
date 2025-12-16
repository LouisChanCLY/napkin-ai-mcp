import { google, drive_v3 } from "googleapis";
import { readFileSync, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { z } from "zod";
import { StorageProvider, StoreFileInput, StorageResult } from "./types.js";

/**
 * Zod schema for Google Drive storage configuration.
 */
export const GoogleDriveStorageConfigSchema = z.object({
  /** Target folder ID in Google Drive. */
  folderId: z.string().min(1),

  /** Path to service account credentials JSON file. */
  credentialsPath: z.string().optional(),

  /** Service account credentials as JSON object (alternative to credentialsPath). */
  credentials: z
    .object({
      client_email: z.string(),
      private_key: z.string(),
    })
    .passthrough()
    .optional(),
});

export type GoogleDriveStorageConfig = z.infer<typeof GoogleDriveStorageConfigSchema>;

/**
 * Storage provider that uploads files to Google Drive.
 *
 * Requires a service account with access to the target folder.
 * Credentials can be provided via a JSON file path or directly as an object.
 *
 * @example
 * ```typescript
 * const storage = new GoogleDriveStorageProvider({
 *   folderId: "1ABC123XYZ",
 *   credentialsPath: "./service-account.json",
 * });
 *
 * const result = await storage.store({
 *   content: svgBuffer,
 *   filename: "diagram.svg",
 *   mimeType: "image/svg+xml",
 * });
 *
 * console.log(result.publicUrl); // "https://drive.google.com/file/d/FILE_ID/view"
 * ```
 */
export class GoogleDriveStorageProvider implements StorageProvider {
  readonly type = "google-drive";
  private readonly config: GoogleDriveStorageConfig;
  private drive: drive_v3.Drive | null = null;

  constructor(config: GoogleDriveStorageConfig) {
    this.config = GoogleDriveStorageConfigSchema.parse(config);
  }

  private getDrive(): drive_v3.Drive {
    if (this.drive) {
      return this.drive;
    }

    let credentials = this.config.credentials;

    if (!credentials && this.config.credentialsPath) {
      if (!existsSync(this.config.credentialsPath)) {
        throw new Error(`Credentials file not found: ${this.config.credentialsPath}`);
      }
      const content = readFileSync(this.config.credentialsPath, "utf-8");
      credentials = JSON.parse(content);
    }

    if (!credentials) {
      throw new Error(
        "Google Drive credentials not configured. " +
          "Provide either credentialsPath or credentials object."
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    this.drive = google.drive({ version: "v3", auth });
    return this.drive;
  }

  async store(input: StoreFileInput): Promise<StorageResult> {
    const drive = this.getDrive();

    const content = Buffer.isBuffer(input.content)
      ? input.content
      : Buffer.from(input.content, "base64");

    const stream = Readable.from(content);

    const response = await drive.files.create({
      requestBody: {
        name: input.filename,
        parents: [this.config.folderId],
      },
      media: {
        mimeType: input.mimeType,
        body: stream,
      },
      fields: "id, name, webViewLink, webContentLink",
    });

    const fileId = response.data.id;

    if (!fileId) {
      throw new Error("Failed to upload file to Google Drive: no file ID returned");
    }

    return {
      location: `gdrive://${fileId}`,
      publicUrl: response.data.webViewLink ?? undefined,
      metadata: {
        fileId,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        folderId: this.config.folderId,
      },
    };
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.folderId && (this.config.credentialsPath || this.config.credentials)
    );
  }
}
