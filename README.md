# Napkin AI MCP Server

An MCP (Model Context Protocol) server for generating infographics and visuals using the [Napkin AI](https://napkin.ai) API. This server enables AI assistants like Claude to generate professional visuals from text content and save them to various storage backends.

## Features

- **Visual Generation**: Generate SVG, PNG, or PPT visuals from text content
- **Async Polling**: Handles Napkin AI's async generation with automatic polling
- **Multi-Storage Support**: Save generated visuals to:
  - Local filesystem
  - Amazon S3 (or S3-compatible services)
  - Google Drive
  - Slack
- **Flexible Configuration**: Configure via environment variables or JSON config file
- **Full TypeScript Support**: Comprehensive type definitions with Zod validation

## Prerequisites

- Node.js 18.x or later
- A Napkin AI API key (currently in developer preview - contact api@napkin.ai)

## Installation

```bash
npm install napkin-ai-mcp
```

Or clone and build from source:

```bash
git clone https://github.com/your-username/napkin-ai-mcp.git
cd napkin-ai-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

The minimum required configuration is your Napkin AI API key:

```bash
export NAPKIN_API_KEY="your-api-key"
```

#### All Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NAPKIN_API_KEY` | Napkin AI API key | Yes |
| `NAPKIN_API_BASE_URL` | Custom API base URL | No |
| `NAPKIN_CONFIG_PATH` | Path to JSON config file | No |
| `NAPKIN_POLLING_INTERVAL` | Polling interval in ms (default: 2000) | No |
| `NAPKIN_MAX_WAIT_TIME` | Max wait time in ms (default: 300000) | No |

#### Storage Configuration

**Local Storage:**
```bash
export NAPKIN_STORAGE_TYPE="local"
export NAPKIN_STORAGE_LOCAL_DIR="./output"
```

**S3 Storage:**
```bash
export NAPKIN_STORAGE_TYPE="s3"
export NAPKIN_STORAGE_S3_BUCKET="my-bucket"
export NAPKIN_STORAGE_S3_REGION="eu-west-1"
export NAPKIN_STORAGE_S3_PREFIX="napkin-visuals/"  # Optional
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
```

**Google Drive Storage:**
```bash
export NAPKIN_STORAGE_TYPE="google-drive"
export NAPKIN_STORAGE_GDRIVE_FOLDER_ID="folder-id"
export NAPKIN_STORAGE_GDRIVE_CREDENTIALS="./service-account.json"
```

**Slack Storage:**
```bash
export NAPKIN_STORAGE_TYPE="slack"
export NAPKIN_STORAGE_SLACK_CHANNEL="C0123456789"
export NAPKIN_STORAGE_SLACK_TOKEN="xoxb-your-token"
```

#### Default Visual Settings

```bash
export NAPKIN_DEFAULT_FORMAT="svg"       # svg, png, or ppt
export NAPKIN_DEFAULT_LANGUAGE="en-GB"   # BCP 47 language tag
export NAPKIN_DEFAULT_STYLE_ID="STYLE123"
export NAPKIN_DEFAULT_COLOR_MODE="light" # light, dark, or both
export NAPKIN_DEFAULT_ORIENTATION="auto" # auto, horizontal, vertical, or square
```

### JSON Configuration

Create a `config.json` file in the working directory or specify a path with `NAPKIN_CONFIG_PATH`:

```json
{
  "napkinApiKey": "your-api-key",
  "storage": {
    "type": "s3",
    "bucket": "my-bucket",
    "region": "eu-west-1",
    "prefix": "napkin-visuals/"
  },
  "defaults": {
    "format": "svg",
    "language": "en-GB",
    "color_mode": "light"
  },
  "pollingInterval": 2000,
  "maxWaitTime": 300000
}
```

## Usage

### Running the Server

```bash
# With environment variables
NAPKIN_API_KEY="your-key" npx napkin-ai-mcp

# Or if installed globally
napkin-ai-mcp
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "napkin-ai": {
      "command": "npx",
      "args": ["napkin-ai-mcp"],
      "env": {
        "NAPKIN_API_KEY": "your-api-key",
        "NAPKIN_STORAGE_TYPE": "local",
        "NAPKIN_STORAGE_LOCAL_DIR": "./output"
      }
    }
  }
}
```

### Available Tools

#### `generate_visual`

Submit a visual generation request. Returns a request ID for tracking.

**Input:**
- `content` (required): Text content to visualise
- `format`: Output format - `svg`, `png`, or `ppt` (default: `svg`)
- `context`: Additional context for generation
- `language`: BCP 47 language tag (e.g., `en-GB`)
- `style_id`: Napkin AI style identifier
- `visual_query`: Visual type (e.g., `mindmap`, `flowchart`, `timeline`)
- `number_of_visuals`: Number of variations (1-4)
- `transparent_background`: Use transparent background
- `color_mode`: `light`, `dark`, or `both`
- `width`, `height`: Dimensions in pixels (PNG only)
- `orientation`: `auto`, `horizontal`, `vertical`, or `square`

#### `check_status`

Check the status of a generation request.

**Input:**
- `request_id` (required): Request ID from `generate_visual`

**Output:**
- Status, progress, and file information when completed

#### `download_visual`

Download a generated visual as base64 data.

**Input:**
- `request_id` (required): Request ID
- `file_id` (required): File ID from status response

**Output:**
- Base64-encoded file content and size

#### `generate_and_wait`

Generate a visual and wait for completion (combines generate + polling).

**Input:** Same as `generate_visual`

**Output:** Completed status with file information

#### `generate_and_save`

Generate a visual and save to configured storage.

**Input:** Same as `generate_visual`, plus:
- `filename`: Custom filename (without extension)

**Output:** Storage locations and public URLs

#### `list_styles`

Get information about available visual styles.

## Programmatic Usage

```typescript
import { NapkinClient, createNapkinMcpServer } from "napkin-ai-mcp";

// Use the client directly
const client = new NapkinClient({
  apiKey: "your-api-key",
});

const result = await client.generateAndWait({
  format: "svg",
  content: "# My Visual\n\n- Point 1\n- Point 2",
  visual_query: "mindmap",
});

// Download the file
const buffer = await client.downloadFile(result.id, result.files[0].id);

// Or create the MCP server programmatically
const server = createNapkinMcpServer({
  napkinApiKey: "your-api-key",
  storage: {
    type: "local",
    directory: "./output",
  },
});
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npm run typecheck

# Lint
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## API Reference

### Napkin AI API

The Napkin AI API is currently in developer preview. For full API documentation, visit:
- [API Documentation](https://api.napkin.ai/docs)
- [Available Styles](https://api.napkin.ai/docs/styles/index.html)

### Visual Query Types

Common visual query types include:
- `mindmap` - Mind map visualisations
- `flowchart` - Process flows and diagrams
- `timeline` - Chronological events
- `comparison` - Side-by-side comparisons
- `hierarchy` - Organisational structures
- `cycle` - Cyclical processes

## Licence

MIT
