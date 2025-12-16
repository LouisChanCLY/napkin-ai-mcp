import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalStorageProvider } from "./local.js";
import { createStorageProvider, StorageConfig } from "./index.js";
import { S3StorageProvider } from "./s3.js";
import { DiscordStorageProvider } from "./discord.js";
import { TelegramStorageProvider } from "./telegram.js";
import { NotionStorageProvider } from "./notion.js";

// Mock @aws-sdk/client-s3
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
}));

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

  it("should create NotionStorageProvider", () => {
    const config: StorageConfig = {
      type: "notion",
      token: "secret_test123",
      pageId: "12345678-abcd-1234-abcd-123456789abc",
    };

    const provider = createStorageProvider(config);
    expect(provider.type).toBe("notion");
  });

  it("should create TelegramStorageProvider", () => {
    const config: StorageConfig = {
      type: "telegram",
      botToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
      chatId: "-1001234567890",
    };

    const provider = createStorageProvider(config);
    expect(provider.type).toBe("telegram");
  });

  it("should create DiscordStorageProvider", () => {
    const config: StorageConfig = {
      type: "discord",
      webhookUrl: "https://discord.com/api/webhooks/123456/abcdef",
    };

    const provider = createStorageProvider(config);
    expect(provider.type).toBe("discord");
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

describe("NotionStorageProvider", () => {
  it("should be configured with token and page ID", () => {
    const provider = createStorageProvider({
      type: "notion",
      token: "secret_test123",
      pageId: "12345678-abcd-1234-abcd-123456789abc",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should accept optional database ID", () => {
    const provider = createStorageProvider({
      type: "notion",
      token: "secret_test123",
      pageId: "12345678-abcd-1234-abcd-123456789abc",
      databaseId: "db-12345678",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should validate required fields", () => {
    expect(() =>
      createStorageProvider({
        type: "notion",
        token: "",
        pageId: "test-page",
      } as StorageConfig)
    ).toThrow();
  });
});

describe("TelegramStorageProvider", () => {
  it("should be configured with bot token and chat ID", () => {
    const provider = createStorageProvider({
      type: "telegram",
      botToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
      chatId: "-1001234567890",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should accept optional caption template", () => {
    const provider = createStorageProvider({
      type: "telegram",
      botToken: "123456:ABC-DEF1234ghIkl",
      chatId: "123456789",
      captionTemplate: "New visual: {filename}",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should validate required fields", () => {
    expect(() =>
      createStorageProvider({
        type: "telegram",
        botToken: "",
        chatId: "123",
      } as StorageConfig)
    ).toThrow();
  });
});

describe("DiscordStorageProvider", () => {
  it("should be configured with webhook URL", () => {
    const provider = createStorageProvider({
      type: "discord",
      webhookUrl: "https://discord.com/api/webhooks/123456/abcdef",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should accept optional username and avatar", () => {
    const provider = createStorageProvider({
      type: "discord",
      webhookUrl: "https://discord.com/api/webhooks/123456/abcdef",
      username: "Napkin AI Bot",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(provider.isConfigured()).toBe(true);
  });

  it("should validate webhook URL format", () => {
    expect(() =>
      createStorageProvider({
        type: "discord",
        webhookUrl: "not-a-valid-url",
      } as StorageConfig)
    ).toThrow();
  });
});

describe("S3StorageProvider store method", () => {
  it("should store file and return correct result", async () => {
    const provider = new S3StorageProvider({
      bucket: "test-bucket",
      region: "eu-west-1",
    });

    const result = await provider.store({
      content: Buffer.from("test content"),
      filename: "test.svg",
      mimeType: "image/svg+xml",
    });

    expect(result.location).toBe("s3://test-bucket/test.svg");
    expect(result.publicUrl).toBe("https://test-bucket.s3.eu-west-1.amazonaws.com/test.svg");
    expect(result.metadata?.bucket).toBe("test-bucket");
    expect(result.metadata?.key).toBe("test.svg");
  });

  it("should handle prefix correctly", async () => {
    const provider = new S3StorageProvider({
      bucket: "test-bucket",
      region: "eu-west-1",
      prefix: "visuals/",
    });

    const result = await provider.store({
      content: Buffer.from("test"),
      filename: "diagram.png",
    });

    expect(result.location).toBe("s3://test-bucket/visuals/diagram.png");
    expect(result.metadata?.key).toBe("visuals/diagram.png");
  });

  it("should handle base64 input", async () => {
    const provider = new S3StorageProvider({
      bucket: "test-bucket",
      region: "us-east-1",
    });

    const base64Content = Buffer.from("test content").toString("base64");
    const result = await provider.store({
      content: base64Content,
      filename: "test.txt",
    });

    expect(result.location).toContain("s3://test-bucket/test.txt");
  });

  it("should use custom endpoint for S3-compatible services", async () => {
    const provider = new S3StorageProvider({
      bucket: "test-bucket",
      region: "auto",
      endpoint: "https://s3.example.com",
    });

    const result = await provider.store({
      content: Buffer.from("test"),
      filename: "file.svg",
    });

    expect(result.publicUrl).toBe("https://s3.example.com/test-bucket/file.svg");
  });
});

describe("DiscordStorageProvider", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should store file via webhook", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "message-123",
          attachments: [{ url: "https://cdn.discord.com/attachments/test.svg" }],
        }),
    });

    const provider = new DiscordStorageProvider({
      webhookUrl: "https://discord.com/api/webhooks/123456/abcdef",
    });

    const result = await provider.store({
      content: Buffer.from("<svg>test</svg>"),
      filename: "test.svg",
      mimeType: "image/svg+xml",
    });

    expect(result.location).toContain("discord:");
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("TelegramStorageProvider", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should store file via Telegram API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          result: {
            message_id: 123,
            document: { file_id: "file-abc123" },
          },
        }),
    });

    const provider = new TelegramStorageProvider({
      botToken: "123456:ABC-token",
      chatId: "-1001234567890",
    });

    const result = await provider.store({
      content: Buffer.from("<svg>test</svg>"),
      filename: "test.svg",
      mimeType: "image/svg+xml",
    });

    expect(result.location).toContain("telegram:");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should handle caption template", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          result: { message_id: 456, document: { file_id: "file-xyz" } },
        }),
    });

    const provider = new TelegramStorageProvider({
      botToken: "123456:ABC-token",
      chatId: "123456789",
      captionTemplate: "New visual: {filename}",
    });

    await provider.store({
      content: Buffer.from("test"),
      filename: "chart.png",
    });

    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("NotionStorageProvider store method", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should store file via Notion API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "block-123",
          type: "file",
          file: { url: "https://notion.so/file.svg" },
        }),
    });

    const provider = new NotionStorageProvider({
      token: "secret_test123",
      pageId: "12345678-abcd-1234-abcd-123456789abc",
    });

    const result = await provider.store({
      content: Buffer.from("<svg>test</svg>"),
      filename: "test.svg",
      mimeType: "image/svg+xml",
    });

    expect(result.location).toContain("notion:");
    expect(mockFetch).toHaveBeenCalled();
  });
});
