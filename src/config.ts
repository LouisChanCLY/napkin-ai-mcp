import { readFileSync, existsSync } from "node:fs";
import { z } from "zod";
import { OutputFormatSchema, ColourModeSchema, OrientationSchema } from "./types.js";
import { StorageConfigSchema, StorageConfig } from "./storage/index.js";

/**
 * Zod schema for MCP server configuration.
 */
export const ServerConfigSchema = z.object({
  /** Napkin AI API key. */
  napkinApiKey: z.string().min(1),

  /** Napkin AI API base URL (default: https://api.napkin.ai). */
  napkinApiBaseUrl: z.string().url().optional(),

  /** Storage provider configuration. */
  storage: StorageConfigSchema.optional(),

  /** Default visual generation settings. */
  defaults: z
    .object({
      format: OutputFormatSchema.optional(),
      context: z.string().optional(),
      language: z.string().optional(),
      style_id: z.string().optional(),
      color_mode: ColourModeSchema.optional(),
      orientation: OrientationSchema.optional(),
    })
    .optional(),

  /** Polling interval in milliseconds when waiting for generation (default: 2000). */
  pollingInterval: z.number().int().min(500).max(30000).optional(),

  /** Maximum wait time in milliseconds for generation (default: 300000 = 5 minutes). */
  maxWaitTime: z.number().int().min(10000).max(600000).optional(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/**
 * Environment variable names used for configuration.
 */
export const ENV_VARS = {
  NAPKIN_API_KEY: "NAPKIN_API_KEY",
  NAPKIN_API_BASE_URL: "NAPKIN_API_BASE_URL",
  NAPKIN_CONFIG_PATH: "NAPKIN_CONFIG_PATH",
  NAPKIN_STORAGE_TYPE: "NAPKIN_STORAGE_TYPE",
  NAPKIN_STORAGE_LOCAL_DIR: "NAPKIN_STORAGE_LOCAL_DIR",
  NAPKIN_STORAGE_S3_BUCKET: "NAPKIN_STORAGE_S3_BUCKET",
  NAPKIN_STORAGE_S3_PREFIX: "NAPKIN_STORAGE_S3_PREFIX",
  NAPKIN_STORAGE_S3_REGION: "NAPKIN_STORAGE_S3_REGION",
  NAPKIN_STORAGE_S3_ENDPOINT: "NAPKIN_STORAGE_S3_ENDPOINT",
  NAPKIN_STORAGE_GDRIVE_FOLDER_ID: "NAPKIN_STORAGE_GDRIVE_FOLDER_ID",
  NAPKIN_STORAGE_GDRIVE_CREDENTIALS: "NAPKIN_STORAGE_GDRIVE_CREDENTIALS",
  NAPKIN_STORAGE_SLACK_CHANNEL: "NAPKIN_STORAGE_SLACK_CHANNEL",
  NAPKIN_STORAGE_SLACK_TOKEN: "NAPKIN_STORAGE_SLACK_TOKEN",
  NAPKIN_STORAGE_NOTION_TOKEN: "NAPKIN_STORAGE_NOTION_TOKEN",
  NAPKIN_STORAGE_NOTION_PAGE_ID: "NAPKIN_STORAGE_NOTION_PAGE_ID",
  NAPKIN_STORAGE_NOTION_DATABASE_ID: "NAPKIN_STORAGE_NOTION_DATABASE_ID",
  NAPKIN_STORAGE_TELEGRAM_BOT_TOKEN: "NAPKIN_STORAGE_TELEGRAM_BOT_TOKEN",
  NAPKIN_STORAGE_TELEGRAM_CHAT_ID: "NAPKIN_STORAGE_TELEGRAM_CHAT_ID",
  NAPKIN_STORAGE_DISCORD_WEBHOOK_URL: "NAPKIN_STORAGE_DISCORD_WEBHOOK_URL",
  NAPKIN_STORAGE_DISCORD_USERNAME: "NAPKIN_STORAGE_DISCORD_USERNAME",
  AWS_ACCESS_KEY_ID: "AWS_ACCESS_KEY_ID",
  AWS_SECRET_ACCESS_KEY: "AWS_SECRET_ACCESS_KEY",
  NAPKIN_POLLING_INTERVAL: "NAPKIN_POLLING_INTERVAL",
  NAPKIN_MAX_WAIT_TIME: "NAPKIN_MAX_WAIT_TIME",
  NAPKIN_DEFAULT_FORMAT: "NAPKIN_DEFAULT_FORMAT",
  NAPKIN_DEFAULT_LANGUAGE: "NAPKIN_DEFAULT_LANGUAGE",
  NAPKIN_DEFAULT_STYLE_ID: "NAPKIN_DEFAULT_STYLE_ID",
  NAPKIN_DEFAULT_COLOR_MODE: "NAPKIN_DEFAULT_COLOR_MODE",
  NAPKIN_DEFAULT_ORIENTATION: "NAPKIN_DEFAULT_ORIENTATION",
} as const;

/**
 * Builds storage configuration from environment variables.
 */
function buildStorageConfigFromEnv(): StorageConfig | undefined {
  const storageType = process.env[ENV_VARS.NAPKIN_STORAGE_TYPE];

  if (!storageType) {
    return undefined;
  }

  switch (storageType) {
    case "local": {
      const directory = process.env[ENV_VARS.NAPKIN_STORAGE_LOCAL_DIR];
      if (!directory) {
        throw new Error(
          `${ENV_VARS.NAPKIN_STORAGE_LOCAL_DIR} is required when storage type is 'local'`
        );
      }
      return { type: "local", directory };
    }

    case "s3": {
      const bucket = process.env[ENV_VARS.NAPKIN_STORAGE_S3_BUCKET];
      const region = process.env[ENV_VARS.NAPKIN_STORAGE_S3_REGION];
      if (!bucket || !region) {
        throw new Error(
          `${ENV_VARS.NAPKIN_STORAGE_S3_BUCKET} and ${ENV_VARS.NAPKIN_STORAGE_S3_REGION} are required when storage type is 's3'`
        );
      }
      return {
        type: "s3",
        bucket,
        region,
        prefix: process.env[ENV_VARS.NAPKIN_STORAGE_S3_PREFIX],
        endpoint: process.env[ENV_VARS.NAPKIN_STORAGE_S3_ENDPOINT],
        accessKeyId: process.env[ENV_VARS.AWS_ACCESS_KEY_ID],
        secretAccessKey: process.env[ENV_VARS.AWS_SECRET_ACCESS_KEY],
      };
    }

    case "google-drive": {
      const folderId = process.env[ENV_VARS.NAPKIN_STORAGE_GDRIVE_FOLDER_ID];
      if (!folderId) {
        throw new Error(
          `${ENV_VARS.NAPKIN_STORAGE_GDRIVE_FOLDER_ID} is required when storage type is 'google-drive'`
        );
      }
      return {
        type: "google-drive",
        folderId,
        credentialsPath: process.env[ENV_VARS.NAPKIN_STORAGE_GDRIVE_CREDENTIALS],
      };
    }

    case "slack": {
      const channelId = process.env[ENV_VARS.NAPKIN_STORAGE_SLACK_CHANNEL];
      if (!channelId) {
        throw new Error(
          `${ENV_VARS.NAPKIN_STORAGE_SLACK_CHANNEL} is required when storage type is 'slack'`
        );
      }
      return {
        type: "slack",
        channelId,
        token: process.env[ENV_VARS.NAPKIN_STORAGE_SLACK_TOKEN],
      };
    }

    case "notion": {
      const token = process.env[ENV_VARS.NAPKIN_STORAGE_NOTION_TOKEN];
      const pageId = process.env[ENV_VARS.NAPKIN_STORAGE_NOTION_PAGE_ID];
      if (!token || !pageId) {
        throw new Error(
          `${ENV_VARS.NAPKIN_STORAGE_NOTION_TOKEN} and ${ENV_VARS.NAPKIN_STORAGE_NOTION_PAGE_ID} are required when storage type is 'notion'`
        );
      }
      return {
        type: "notion",
        token,
        pageId,
        databaseId: process.env[ENV_VARS.NAPKIN_STORAGE_NOTION_DATABASE_ID],
      };
    }

    case "telegram": {
      const botToken = process.env[ENV_VARS.NAPKIN_STORAGE_TELEGRAM_BOT_TOKEN];
      const chatId = process.env[ENV_VARS.NAPKIN_STORAGE_TELEGRAM_CHAT_ID];
      if (!botToken || !chatId) {
        throw new Error(
          `${ENV_VARS.NAPKIN_STORAGE_TELEGRAM_BOT_TOKEN} and ${ENV_VARS.NAPKIN_STORAGE_TELEGRAM_CHAT_ID} are required when storage type is 'telegram'`
        );
      }
      return {
        type: "telegram",
        botToken,
        chatId,
      };
    }

    case "discord": {
      const webhookUrl = process.env[ENV_VARS.NAPKIN_STORAGE_DISCORD_WEBHOOK_URL];
      if (!webhookUrl) {
        throw new Error(
          `${ENV_VARS.NAPKIN_STORAGE_DISCORD_WEBHOOK_URL} is required when storage type is 'discord'`
        );
      }
      return {
        type: "discord",
        webhookUrl,
        username: process.env[ENV_VARS.NAPKIN_STORAGE_DISCORD_USERNAME],
      };
    }

    default:
      throw new Error(`Unknown storage type: ${storageType}`);
  }
}

/**
 * Builds configuration from environment variables.
 */
function buildConfigFromEnv(): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {};

  const apiKey = process.env[ENV_VARS.NAPKIN_API_KEY];
  if (apiKey) {
    config.napkinApiKey = apiKey;
  }

  const baseUrl = process.env[ENV_VARS.NAPKIN_API_BASE_URL];
  if (baseUrl) {
    config.napkinApiBaseUrl = baseUrl;
  }

  const storage = buildStorageConfigFromEnv();
  if (storage) {
    config.storage = storage;
  }

  const pollingInterval = process.env[ENV_VARS.NAPKIN_POLLING_INTERVAL];
  if (pollingInterval) {
    config.pollingInterval = parseInt(pollingInterval, 10);
  }

  const maxWaitTime = process.env[ENV_VARS.NAPKIN_MAX_WAIT_TIME];
  if (maxWaitTime) {
    config.maxWaitTime = parseInt(maxWaitTime, 10);
  }

  const defaultFormat = process.env[ENV_VARS.NAPKIN_DEFAULT_FORMAT];
  const defaultLanguage = process.env[ENV_VARS.NAPKIN_DEFAULT_LANGUAGE];
  const defaultStyleId = process.env[ENV_VARS.NAPKIN_DEFAULT_STYLE_ID];
  const defaultColorMode = process.env[ENV_VARS.NAPKIN_DEFAULT_COLOR_MODE];
  const defaultOrientation = process.env[ENV_VARS.NAPKIN_DEFAULT_ORIENTATION];

  if (
    defaultFormat ||
    defaultLanguage ||
    defaultStyleId ||
    defaultColorMode ||
    defaultOrientation
  ) {
    config.defaults = {};
    if (defaultFormat) {
      config.defaults.format = defaultFormat as "svg" | "png" | "ppt";
    }
    if (defaultLanguage) {
      config.defaults.language = defaultLanguage;
    }
    if (defaultStyleId) {
      config.defaults.style_id = defaultStyleId;
    }
    if (defaultColorMode) {
      config.defaults.color_mode = defaultColorMode as "light" | "dark" | "both";
    }
    if (defaultOrientation) {
      config.defaults.orientation = defaultOrientation as
        | "auto"
        | "horizontal"
        | "vertical"
        | "square";
    }
  }

  return config;
}

/**
 * Loads configuration from a JSON file.
 */
function loadConfigFromFile(configPath: string): Partial<ServerConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, "utf-8");
  return JSON.parse(content) as Partial<ServerConfig>;
}

/**
 * Merges configuration sources with proper precedence.
 * Priority (highest to lowest): environment variables > config file > defaults
 */
function mergeConfigs(...configs: Partial<ServerConfig>[]): Partial<ServerConfig> {
  const result: Partial<ServerConfig> = {};

  for (const config of configs) {
    if (config.napkinApiKey) {
      result.napkinApiKey = config.napkinApiKey;
    }
    if (config.napkinApiBaseUrl) {
      result.napkinApiBaseUrl = config.napkinApiBaseUrl;
    }
    if (config.storage) {
      result.storage = config.storage;
    }
    if (config.pollingInterval) {
      result.pollingInterval = config.pollingInterval;
    }
    if (config.maxWaitTime) {
      result.maxWaitTime = config.maxWaitTime;
    }
    if (config.defaults) {
      result.defaults = { ...result.defaults, ...config.defaults };
    }
  }

  return result;
}

/**
 * Loads and validates the server configuration.
 *
 * Configuration is loaded from multiple sources with the following precedence:
 * 1. Environment variables (highest priority)
 * 2. Configuration file (if NAPKIN_CONFIG_PATH is set or config.json exists)
 * 3. Default values (lowest priority)
 *
 * @throws Error if configuration is invalid or required values are missing
 */
export function loadConfig(): ServerConfig {
  const configs: Partial<ServerConfig>[] = [];

  const configPath = process.env[ENV_VARS.NAPKIN_CONFIG_PATH];
  if (configPath) {
    configs.push(loadConfigFromFile(configPath));
  } else if (existsSync("config.json")) {
    configs.push(loadConfigFromFile("config.json"));
  }

  configs.push(buildConfigFromEnv());

  const merged = mergeConfigs(...configs);

  const result = ServerConfigSchema.safeParse(merged);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  return result.data;
}

/**
 * Creates a configuration object from explicit values.
 * Useful for testing or programmatic configuration.
 */
export function createConfig(config: ServerConfig): ServerConfig {
  const result = ServerConfigSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${errors}`);
  }
  return result.data;
}
