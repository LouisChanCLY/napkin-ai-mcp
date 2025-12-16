#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { startServer, NapkinMcpServerConfig } from "./server.js";
import { StorageConfig } from "./storage/index.js";

/**
 * Napkin AI MCP Server
 *
 * An MCP server that provides tools for generating infographics and visuals
 * using the Napkin AI API.
 *
 * Configuration is loaded from:
 * 1. Environment variables (highest priority)
 * 2. config.json file (if present)
 * 3. File specified by NAPKIN_CONFIG_PATH
 *
 * Required environment variable:
 * - NAPKIN_API_KEY: Your Napkin AI API key
 *
 * Optional environment variables:
 * - NAPKIN_API_BASE_URL: Custom API base URL
 * - NAPKIN_STORAGE_TYPE: Storage type (local, s3, google-drive, slack)
 * - NAPKIN_POLLING_INTERVAL: Polling interval in ms (default: 2000)
 * - NAPKIN_MAX_WAIT_TIME: Max wait time in ms (default: 300000)
 *
 * Storage-specific environment variables:
 * Local: NAPKIN_STORAGE_LOCAL_DIR
 * S3: NAPKIN_STORAGE_S3_BUCKET, NAPKIN_STORAGE_S3_REGION, NAPKIN_STORAGE_S3_PREFIX
 * Google Drive: NAPKIN_STORAGE_GDRIVE_FOLDER_ID, NAPKIN_STORAGE_GDRIVE_CREDENTIALS
 * Slack: NAPKIN_STORAGE_SLACK_CHANNEL, NAPKIN_STORAGE_SLACK_TOKEN
 */

async function main(): Promise<void> {
  try {
    const rawConfig = loadConfig();

    const config: NapkinMcpServerConfig = {
      napkinApiKey: rawConfig.napkinApiKey,
      napkinApiBaseUrl: rawConfig.napkinApiBaseUrl,
      pollingInterval: rawConfig.pollingInterval,
      maxWaitTime: rawConfig.maxWaitTime,
      defaults: rawConfig.defaults,
    };

    if (rawConfig.storage) {
      config.storage = rawConfig.storage as StorageConfig;
    }

    await startServer(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start Napkin AI MCP server: ${message}`);
    process.exit(1);
  }
}

main();

export { NapkinClient, NapkinApiError } from "./client.js";
export { createNapkinMcpServer, startServer } from "./server.js";
export type { NapkinMcpServerConfig } from "./server.js";
export { loadConfig, createConfig } from "./config.js";
export * from "./types.js";
export * from "./storage/index.js";
