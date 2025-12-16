import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, createConfig, ENV_VARS, ServerConfigSchema } from "./config.js";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear all Napkin-related env vars
    Object.values(ENV_VARS).forEach((key) => {
      delete process.env[key];
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("ServerConfigSchema", () => {
    it("should validate valid configuration", () => {
      const config = {
        napkinApiKey: "test-api-key",
      };

      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should require napkinApiKey", () => {
      const config = {};

      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should validate optional fields", () => {
      const config = {
        napkinApiKey: "test-api-key",
        napkinApiBaseUrl: "https://custom.api.napkin.ai",
        pollingInterval: 5000,
        maxWaitTime: 60000,
        defaults: {
          format: "png",
          language: "en-GB",
          color_mode: "dark",
          orientation: "horizontal",
        },
      };

      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.napkinApiBaseUrl).toBe("https://custom.api.napkin.ai");
        expect(result.data.pollingInterval).toBe(5000);
        expect(result.data.defaults?.format).toBe("png");
      }
    });

    it("should reject invalid pollingInterval", () => {
      const config = {
        napkinApiKey: "test-api-key",
        pollingInterval: 100, // Below minimum of 500
      };

      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject invalid maxWaitTime", () => {
      const config = {
        napkinApiKey: "test-api-key",
        maxWaitTime: 1000000, // Above maximum of 600000
      };

      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject invalid format", () => {
      const config = {
        napkinApiKey: "test-api-key",
        defaults: {
          format: "pdf", // Invalid format
        },
      };

      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject invalid color_mode", () => {
      const config = {
        napkinApiKey: "test-api-key",
        defaults: {
          color_mode: "rainbow", // Invalid color mode
        },
      };

      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("createConfig", () => {
    it("should create valid configuration", () => {
      const config = createConfig({
        napkinApiKey: "test-api-key",
      });

      expect(config.napkinApiKey).toBe("test-api-key");
    });

    it("should throw on invalid configuration", () => {
      expect(() =>
        createConfig({
          napkinApiKey: "", // Empty string should fail
        })
      ).toThrow("Invalid configuration");
    });

    it("should preserve all valid fields", () => {
      const config = createConfig({
        napkinApiKey: "test-api-key",
        napkinApiBaseUrl: "https://custom.api.napkin.ai",
        pollingInterval: 3000,
        maxWaitTime: 120000,
        defaults: {
          format: "svg",
          language: "de",
        },
      });

      expect(config.napkinApiKey).toBe("test-api-key");
      expect(config.napkinApiBaseUrl).toBe("https://custom.api.napkin.ai");
      expect(config.pollingInterval).toBe(3000);
      expect(config.maxWaitTime).toBe(120000);
      expect(config.defaults?.format).toBe("svg");
      expect(config.defaults?.language).toBe("de");
    });
  });

  describe("loadConfig", () => {
    it("should load configuration from environment variables", () => {
      process.env.NAPKIN_API_KEY = "env-api-key";
      process.env.NAPKIN_API_BASE_URL = "https://env.api.napkin.ai";
      process.env.NAPKIN_POLLING_INTERVAL = "5000";
      process.env.NAPKIN_MAX_WAIT_TIME = "120000";

      const config = loadConfig();

      expect(config.napkinApiKey).toBe("env-api-key");
      expect(config.napkinApiBaseUrl).toBe("https://env.api.napkin.ai");
      expect(config.pollingInterval).toBe(5000);
      expect(config.maxWaitTime).toBe(120000);
    });

    it("should throw when NAPKIN_API_KEY is missing", () => {
      expect(() => loadConfig()).toThrow("Invalid configuration");
    });

    it("should load default format from environment", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_DEFAULT_FORMAT = "png";
      process.env.NAPKIN_DEFAULT_LANGUAGE = "fr";
      process.env.NAPKIN_DEFAULT_COLOR_MODE = "dark";

      const config = loadConfig();

      expect(config.defaults?.format).toBe("png");
      expect(config.defaults?.language).toBe("fr");
      expect(config.defaults?.color_mode).toBe("dark");
    });

    it("should load local storage configuration", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "local";
      process.env.NAPKIN_STORAGE_LOCAL_DIR = "/tmp/napkin-output";

      const config = loadConfig();

      expect(config.storage).toEqual({
        type: "local",
        directory: "/tmp/napkin-output",
      });
    });

    it("should throw when local storage is missing directory", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "local";

      expect(() => loadConfig()).toThrow("NAPKIN_STORAGE_LOCAL_DIR is required");
    });

    it("should load S3 storage configuration", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "s3";
      process.env.NAPKIN_STORAGE_S3_BUCKET = "my-bucket";
      process.env.NAPKIN_STORAGE_S3_REGION = "eu-west-1";
      process.env.NAPKIN_STORAGE_S3_PREFIX = "napkin/";
      process.env.AWS_ACCESS_KEY_ID = "access-key";
      process.env.AWS_SECRET_ACCESS_KEY = "secret-key";

      const config = loadConfig();

      expect(config.storage).toEqual({
        type: "s3",
        bucket: "my-bucket",
        region: "eu-west-1",
        prefix: "napkin/",
        accessKeyId: "access-key",
        secretAccessKey: "secret-key",
        endpoint: undefined,
      });
    });

    it("should throw when S3 storage is missing required fields", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "s3";
      process.env.NAPKIN_STORAGE_S3_BUCKET = "my-bucket";
      // Missing NAPKIN_STORAGE_S3_REGION

      expect(() => loadConfig()).toThrow("NAPKIN_STORAGE_S3_REGION");
    });

    it("should load Google Drive storage configuration", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "google-drive";
      process.env.NAPKIN_STORAGE_GDRIVE_FOLDER_ID = "folder-123";
      process.env.NAPKIN_STORAGE_GDRIVE_CREDENTIALS = "/path/to/creds.json";

      const config = loadConfig();

      expect(config.storage).toEqual({
        type: "google-drive",
        folderId: "folder-123",
        credentialsPath: "/path/to/creds.json",
      });
    });

    it("should load Slack storage configuration", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "slack";
      process.env.NAPKIN_STORAGE_SLACK_CHANNEL = "C12345";
      process.env.NAPKIN_STORAGE_SLACK_TOKEN = "xoxb-token";

      const config = loadConfig();

      expect(config.storage).toEqual({
        type: "slack",
        channelId: "C12345",
        token: "xoxb-token",
      });
    });

    it("should load Notion storage configuration", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "notion";
      process.env.NAPKIN_STORAGE_NOTION_TOKEN = "secret_token";
      process.env.NAPKIN_STORAGE_NOTION_PAGE_ID = "page-123";
      process.env.NAPKIN_STORAGE_NOTION_DATABASE_ID = "db-456";

      const config = loadConfig();

      expect(config.storage).toEqual({
        type: "notion",
        token: "secret_token",
        pageId: "page-123",
        databaseId: "db-456",
      });
    });

    it("should load Telegram storage configuration", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "telegram";
      process.env.NAPKIN_STORAGE_TELEGRAM_BOT_TOKEN = "bot-token";
      process.env.NAPKIN_STORAGE_TELEGRAM_CHAT_ID = "-1001234567890";

      const config = loadConfig();

      expect(config.storage).toEqual({
        type: "telegram",
        botToken: "bot-token",
        chatId: "-1001234567890",
      });
    });

    it("should load Discord storage configuration", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "discord";
      process.env.NAPKIN_STORAGE_DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
      process.env.NAPKIN_STORAGE_DISCORD_USERNAME = "Napkin Bot";

      const config = loadConfig();

      expect(config.storage).toEqual({
        type: "discord",
        webhookUrl: "https://discord.com/api/webhooks/123/abc",
        username: "Napkin Bot",
      });
    });

    it("should throw on unknown storage type", () => {
      process.env.NAPKIN_API_KEY = "test-key";
      process.env.NAPKIN_STORAGE_TYPE = "unknown";

      expect(() => loadConfig()).toThrow("Unknown storage type: unknown");
    });
  });

  describe("ENV_VARS", () => {
    it("should export all expected environment variable names", () => {
      expect(ENV_VARS.NAPKIN_API_KEY).toBe("NAPKIN_API_KEY");
      expect(ENV_VARS.NAPKIN_API_BASE_URL).toBe("NAPKIN_API_BASE_URL");
      expect(ENV_VARS.NAPKIN_STORAGE_TYPE).toBe("NAPKIN_STORAGE_TYPE");
      expect(ENV_VARS.NAPKIN_STORAGE_LOCAL_DIR).toBe("NAPKIN_STORAGE_LOCAL_DIR");
      expect(ENV_VARS.NAPKIN_STORAGE_S3_BUCKET).toBe("NAPKIN_STORAGE_S3_BUCKET");
    });
  });
});
