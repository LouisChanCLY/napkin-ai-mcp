import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { StorageProvider, StoreFileInput, StorageResult } from "./types.js";

/**
 * Zod schema for S3 storage configuration.
 */
export const S3StorageConfigSchema = z.object({
  /** S3 bucket name. */
  bucket: z.string().min(1),

  /** Optional prefix for object keys. */
  prefix: z.string().optional(),

  /** AWS region. */
  region: z.string().min(1),

  /** AWS access key ID (can also use environment variables). */
  accessKeyId: z.string().optional(),

  /** AWS secret access key (can also use environment variables). */
  secretAccessKey: z.string().optional(),

  /** Custom endpoint URL for S3-compatible services. */
  endpoint: z.string().url().optional(),

  /** Force path-style addressing (required for some S3-compatible services). */
  forcePathStyle: z.boolean().optional(),
});

export type S3StorageConfig = z.infer<typeof S3StorageConfigSchema>;

/**
 * Storage provider that uploads files to Amazon S3 or S3-compatible services.
 *
 * Credentials can be provided via configuration or standard AWS environment
 * variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).
 *
 * @example
 * ```typescript
 * const storage = new S3StorageProvider({
 *   bucket: "my-bucket",
 *   region: "eu-west-1",
 *   prefix: "napkin-visuals/",
 * });
 *
 * const result = await storage.store({
 *   content: pngBuffer,
 *   filename: "diagram.png",
 *   mimeType: "image/png",
 * });
 *
 * console.log(result.publicUrl); // "https://my-bucket.s3.eu-west-1.amazonaws.com/napkin-visuals/diagram.png"
 * ```
 */
export class S3StorageProvider implements StorageProvider {
  readonly type = "s3";
  private readonly config: S3StorageConfig;
  private readonly client: S3Client;

  constructor(config: S3StorageConfig) {
    this.config = S3StorageConfigSchema.parse(config);

    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: this.config.region,
    };

    if (this.config.accessKeyId && this.config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      };
    }

    if (this.config.endpoint) {
      clientConfig.endpoint = this.config.endpoint;
    }

    if (this.config.forcePathStyle) {
      clientConfig.forcePathStyle = this.config.forcePathStyle;
    }

    this.client = new S3Client(clientConfig);
  }

  async store(input: StoreFileInput): Promise<StorageResult> {
    const content = Buffer.isBuffer(input.content)
      ? input.content
      : Buffer.from(input.content, "base64");

    const key = this.config.prefix
      ? `${this.config.prefix.replace(/\/$/, "")}/${input.filename}`
      : input.filename;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: content,
      ContentType: input.mimeType,
      Metadata: input.metadata as Record<string, string> | undefined,
    });

    await this.client.send(command);

    const publicUrl = this.config.endpoint
      ? `${this.config.endpoint}/${this.config.bucket}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;

    return {
      location: `s3://${this.config.bucket}/${key}`,
      publicUrl,
      metadata: {
        bucket: this.config.bucket,
        key,
        region: this.config.region,
      },
    };
  }

  isConfigured(): boolean {
    return Boolean(this.config.bucket && this.config.region);
  }
}
