#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig } from "./config.js";
import { startServer, NapkinMcpServerConfig } from "./server.js";
import { StorageConfig } from "./storage/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const packagePath = join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version || "unknown";
  } catch {
    return "unknown";
  }
}

function showHelp(): void {
  console.log(`
Napkin AI MCP Server v${getVersion()}

An unofficial MCP server for generating infographics and visuals using the Napkin AI API.

USAGE:
  npx napkin-ai-mcp [options]

OPTIONS:
  --help, -h      Show this help message
  --version, -v   Show version number

ENVIRONMENT VARIABLES:
  Required:
    NAPKIN_API_KEY              Your Napkin AI API key

  Optional:
    NAPKIN_API_BASE_URL         Custom API base URL
    NAPKIN_STORAGE_TYPE         Storage type: local, s3, google-drive, slack, notion, telegram, discord
    NAPKIN_POLLING_INTERVAL     Polling interval in ms (default: 2000)
    NAPKIN_MAX_WAIT_TIME        Max wait time in ms (default: 300000)
    NAPKIN_DEBUG                Enable debug logging (set to "true")

  Storage (Local):
    NAPKIN_STORAGE_LOCAL_DIR    Directory path for saving visuals

  Storage (S3):
    NAPKIN_STORAGE_S3_BUCKET    S3 bucket name
    NAPKIN_STORAGE_S3_REGION    AWS region
    NAPKIN_STORAGE_S3_PREFIX    Optional path prefix
    NAPKIN_STORAGE_S3_ENDPOINT  Optional endpoint for S3-compatible services

  Storage (Google Drive):
    NAPKIN_STORAGE_GDRIVE_FOLDER_ID     Target folder ID
    NAPKIN_STORAGE_GDRIVE_CREDENTIALS   Path to service account JSON

  Storage (Slack):
    NAPKIN_STORAGE_SLACK_CHANNEL  Channel ID
    NAPKIN_STORAGE_SLACK_TOKEN    Bot token (xoxb-...)

  Storage (Notion):
    NAPKIN_STORAGE_NOTION_TOKEN   Integration token (secret_...)
    NAPKIN_STORAGE_NOTION_PAGE_ID Target page ID

  Storage (Telegram):
    NAPKIN_STORAGE_TELEGRAM_BOT_TOKEN  Bot token from @BotFather
    NAPKIN_STORAGE_TELEGRAM_CHAT_ID    Target chat/channel ID

  Storage (Discord):
    NAPKIN_STORAGE_DISCORD_WEBHOOK_URL  Webhook URL
    NAPKIN_STORAGE_DISCORD_USERNAME     Optional bot username

EXAMPLES:
  # Basic usage
  NAPKIN_API_KEY=your-key npx napkin-ai-mcp

  # With local storage
  NAPKIN_API_KEY=your-key NAPKIN_STORAGE_TYPE=local NAPKIN_STORAGE_LOCAL_DIR=./visuals npx napkin-ai-mcp

For more information, visit: https://github.com/LouisChanCLY/napkin-ai-mcp
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(getVersion());
    process.exit(0);
  }

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
