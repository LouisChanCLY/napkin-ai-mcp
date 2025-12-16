import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalStorageProvider } from "./local.js";
import { createStorageProvider, StorageConfig } from "./index.js";

describe("LocalStorageProvider", () => {
  const testDir = join(tmpdir(), "napkin-test-" + Date.now());

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should store a file from Buffer", async () => {
    const provider = new LocalStorageProvider({ directory: testDir });
    const content = Buffer.from("<svg>test</svg>");

    const result = await provider.store({
      content,
      filename: "test.svg",
      mimeType: "image/svg+xml",
    });

    expect(result.location).toBe(join(testDir, "test.svg"));
    expect(existsSync(result.location)).toBe(true);
    expect(readFileSync(result.location, "utf-8")).toBe("<svg>test</svg>");
  });

  it("should store a file from base64 string", async () => {
    const provider = new LocalStorageProvider({ directory: testDir });
    const originalContent = "PNG file content";
    const base64Content = Buffer.from(originalContent).toString("base64");

    const result = await provider.store({
      content: base64Content,
      filename: "test.png",
    });

    expect(existsSync(result.location)).toBe(true);
    expect(readFileSync(result.location, "utf-8")).toBe(originalContent);
  });

  it("should create directory if it does not exist", async () => {
    const nestedDir = join(testDir, "nested", "path");
    const provider = new LocalStorageProvider({ directory: nestedDir });

    await provider.store({
      content: Buffer.from("test"),
      filename: "test.txt",
    });

    expect(existsSync(join(nestedDir, "test.txt"))).toBe(true);
  });

  it("should include metadata in result", async () => {
    const provider = new LocalStorageProvider({ directory: testDir });

    const result = await provider.store({
      content: Buffer.from("test"),
      filename: "test.txt",
    });

    expect(result.metadata).toMatchObject({
      directory: testDir,
      filename: "test.txt",
      size: 4,
    });
  });

  it("should report as configured", () => {
    const provider = new LocalStorageProvider({ directory: testDir });
    expect(provider.isConfigured()).toBe(true);
  });

  it("should validate configuration", () => {
    expect(() => new LocalStorageProvider({ directory: "" })).toThrow();
  });
});

describe("createStorageProvider", () => {
  it("should create LocalStorageProvider", () => {
    const config: StorageConfig = {
      type: "local",
      directory: "/tmp/test",
    };

    const provider = createStorageProvider(config);
    expect(provider.type).toBe("local");
  });

  it("should create S3StorageProvider", () => {
    const config: StorageConfig = {
      type: "s3",
      bucket: "test-bucket",
      region: "eu-west-1",
    };

    const provider = createStorageProvider(config);
    expect(provider.type).toBe("s3");
  });

  it("should create GoogleDriveStorageProvider", () => {
    const config: StorageConfig = {
      type: "google-drive",
      folderId: "folder123",
      credentials: {
        client_email: "test@example.com",
        private_key: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
      },
    };

    const provider = createStorageProvider(config);
    expect(provider.type).toBe("google-drive");
  });

  it("should create SlackStorageProvider", () => {
    const config: StorageConfig = {
      type: "slack",
      channelId: "C0123456789",
      token: "xoxb-test-token",
    };

    const provider = createStorageProvider(config);
    expect(provider.type).toBe("slack");
  });

  it("should reject invalid configuration", () => {
    expect(() =>
      createStorageProvider({
        type: "invalid" as "local",
        directory: "/tmp",
      })
    ).toThrow();
  });
});

describe("S3StorageProvider", () => {
  it("should be configured with bucket and region", () => {
    const provider = createStorageProvider({
      type: "s3",
      bucket: "test-bucket",
      region: "eu-west-1",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should include optional prefix in configuration", () => {
    const provider = createStorageProvider({
      type: "s3",
      bucket: "test-bucket",
      region: "eu-west-1",
      prefix: "visuals/",
    });

    expect(provider.isConfigured()).toBe(true);
  });
});

describe("GoogleDriveStorageProvider", () => {
  it("should be configured with folder ID and credentials", () => {
    const provider = createStorageProvider({
      type: "google-drive",
      folderId: "folder123",
      credentials: {
        client_email: "test@example.com",
        private_key: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
      },
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should not be configured without credentials", () => {
    const provider = createStorageProvider({
      type: "google-drive",
      folderId: "folder123",
    });

    expect(provider.isConfigured()).toBe(false);
  });
});

describe("SlackStorageProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should be configured with channel ID and token", () => {
    const provider = createStorageProvider({
      type: "slack",
      channelId: "C0123456789",
      token: "xoxb-test-token",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should use environment variable for token", () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-env-token";

    const provider = createStorageProvider({
      type: "slack",
      channelId: "C0123456789",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should not be configured without token", () => {
    delete process.env.SLACK_BOT_TOKEN;

    const provider = createStorageProvider({
      type: "slack",
      channelId: "C0123456789",
    });

    expect(provider.isConfigured()).toBe(false);
  });
});
