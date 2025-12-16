# Napkin AI MCP Server

[![CI](https://github.com/your-username/napkin-ai-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/napkin-ai-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/napkin-ai-mcp.svg)](https://www.npmjs.com/package/napkin-ai-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server for generating infographics and visuals using the [Napkin AI](https://napkin.ai) API. This server enables AI assistants like Claude to generate professional visuals from text content.

## Features

- **Visual Generation**: Generate SVG, PNG, or PPT visuals from text content
- **Multiple Visual Types**: Mindmaps, flowcharts, timelines, comparisons, and more
- **Async Handling**: Automatic polling for Napkin AI's async generation
- **Multi-Storage Support**: Save generated visuals to:
  - Local filesystem
  - Amazon S3 (or S3-compatible services)
  - Google Drive
  - Slack
- **Flexible Configuration**: Environment variables or JSON config file
- **Full TypeScript Support**: Comprehensive type definitions with Zod validation

## Prerequisites

- Node.js 18.x or later
- A Napkin AI API key (currently in developer preview - contact api@napkin.ai)

## Quick Start

### Installation

```bash
npm install -g napkin-ai-mcp
```

Or use directly with npx:

```bash
npx napkin-ai-mcp
```

### Get Your API Key

The Napkin AI API is currently in developer preview. To request access:
1. Visit [napkin.ai](https://napkin.ai)
2. Contact api@napkin.ai for API access

---

## Integration Guides

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "napkin-ai": {
      "command": "npx",
      "args": ["-y", "napkin-ai-mcp"],
      "env": {
        "NAPKIN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

With local storage enabled:

```json
{
  "mcpServers": {
    "napkin-ai": {
      "command": "npx",
      "args": ["-y", "napkin-ai-mcp"],
      "env": {
        "NAPKIN_API_KEY": "your-api-key-here",
        "NAPKIN_STORAGE_TYPE": "local",
        "NAPKIN_STORAGE_LOCAL_DIR": "/Users/yourname/napkin-visuals"
      }
    }
  }
}
```

After updating the config, restart Claude Desktop.

---

### Claude Code (CLI)

Add to your Claude Code MCP settings:

**Global config**: `~/.claude/settings.json`
**Project config**: `.claude/settings.json`

```json
{
  "mcpServers": {
    "napkin-ai": {
      "command": "npx",
      "args": ["-y", "napkin-ai-mcp"],
      "env": {
        "NAPKIN_API_KEY": "your-api-key-here",
        "NAPKIN_STORAGE_TYPE": "local",
        "NAPKIN_STORAGE_LOCAL_DIR": "./visuals"
      }
    }
  }
}
```

Or run the CLI command:

```bash
claude mcp add napkin-ai -- npx -y napkin-ai-mcp
```

Then set the environment variable:
```bash
export NAPKIN_API_KEY="your-api-key-here"
```

---

### Cursor

Add to your Cursor MCP configuration:

**File**: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "napkin-ai": {
      "command": "npx",
      "args": ["-y", "napkin-ai-mcp"],
      "env": {
        "NAPKIN_API_KEY": "your-api-key-here",
        "NAPKIN_STORAGE_TYPE": "local",
        "NAPKIN_STORAGE_LOCAL_DIR": "./visuals"
      }
    }
  }
}
```

---

### Windsurf

Add to your Windsurf MCP configuration:

**File**: `~/.windsurf/mcp.json`

```json
{
  "mcpServers": {
    "napkin-ai": {
      "command": "npx",
      "args": ["-y", "napkin-ai-mcp"],
      "env": {
        "NAPKIN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

---

### VS Code with Continue

Add to your Continue configuration:

**File**: `~/.continue/config.json`

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "napkin-ai-mcp"],
          "env": {
            "NAPKIN_API_KEY": "your-api-key-here"
          }
        }
      }
    ]
  }
}
```

---

### Cline (VS Code Extension)

Add to your Cline MCP settings in VS Code:

1. Open VS Code settings
2. Search for "Cline MCP"
3. Add the server configuration:

```json
{
  "napkin-ai": {
    "command": "npx",
    "args": ["-y", "napkin-ai-mcp"],
    "env": {
      "NAPKIN_API_KEY": "your-api-key-here"
    }
  }
}
```

---

## Available Tools

Once configured, your AI assistant will have access to these tools:

| Tool | Description |
|------|-------------|
| `generate_visual` | Submit a visual generation request (async) |
| `check_status` | Check the status of a generation request |
| `download_visual` | Download a generated visual as base64 |
| `generate_and_wait` | Generate and wait for completion |
| `generate_and_save` | Generate and save to configured storage |
| `list_styles` | Get information about available styles |

### Example Prompts

Once configured, try these prompts with your AI assistant:

- "Create a mindmap visualising the key concepts of machine learning"
- "Generate a flowchart showing the user registration process"
- "Make a timeline of major events in the history of computing"
- "Create an infographic comparing REST vs GraphQL APIs"

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NAPKIN_API_KEY` | Napkin AI API key | Yes |
| `NAPKIN_API_BASE_URL` | Custom API base URL | No |
| `NAPKIN_STORAGE_TYPE` | Storage type: `local`, `s3`, `google-drive`, `slack` | No |
| `NAPKIN_POLLING_INTERVAL` | Polling interval in ms (default: 2000) | No |
| `NAPKIN_MAX_WAIT_TIME` | Max wait time in ms (default: 300000) | No |

### Storage Configuration

#### Local Storage
```bash
NAPKIN_STORAGE_TYPE=local
NAPKIN_STORAGE_LOCAL_DIR=./output
```

#### Amazon S3
```bash
NAPKIN_STORAGE_TYPE=s3
NAPKIN_STORAGE_S3_BUCKET=my-bucket
NAPKIN_STORAGE_S3_REGION=eu-west-1
NAPKIN_STORAGE_S3_PREFIX=napkin-visuals/  # Optional
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### Google Drive
```bash
NAPKIN_STORAGE_TYPE=google-drive
NAPKIN_STORAGE_GDRIVE_FOLDER_ID=folder-id
NAPKIN_STORAGE_GDRIVE_CREDENTIALS=./service-account.json
```

#### Slack
```bash
NAPKIN_STORAGE_TYPE=slack
NAPKIN_STORAGE_SLACK_CHANNEL=C0123456789
NAPKIN_STORAGE_SLACK_TOKEN=xoxb-your-token
```

### Default Visual Settings

```bash
NAPKIN_DEFAULT_FORMAT=svg       # svg, png, or ppt
NAPKIN_DEFAULT_LANGUAGE=en-GB   # BCP 47 language tag
NAPKIN_DEFAULT_COLOR_MODE=light # light, dark, or both
NAPKIN_DEFAULT_ORIENTATION=auto # auto, horizontal, vertical, or square
```

### JSON Configuration

Create a `config.json` file:

```json
{
  "napkinApiKey": "your-api-key",
  "storage": {
    "type": "local",
    "directory": "./visuals"
  },
  "defaults": {
    "format": "svg",
    "language": "en-GB",
    "color_mode": "light"
  }
}
```

---

## Tool Parameters

### generate_visual / generate_and_wait

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | string | **Required**. Text content to visualise |
| `format` | string | Output format: `svg`, `png`, or `ppt` |
| `context` | string | Additional context for generation |
| `language` | string | BCP 47 language tag (e.g., `en-GB`) |
| `style_id` | string | Napkin AI style identifier |
| `visual_query` | string | Visual type: `mindmap`, `flowchart`, `timeline`, etc. |
| `number_of_visuals` | number | Variations to generate (1-4) |
| `transparent_background` | boolean | Use transparent background |
| `color_mode` | string | `light`, `dark`, or `both` |
| `width` | number | Width in pixels (PNG only) |
| `height` | number | Height in pixels (PNG only) |
| `orientation` | string | `auto`, `horizontal`, `vertical`, or `square` |

### Visual Query Types

- `mindmap` - Mind map visualisations
- `flowchart` - Process flows and diagrams
- `timeline` - Chronological events
- `comparison` - Side-by-side comparisons
- `hierarchy` - Organisational structures
- `cycle` - Cyclical processes
- `list` - Bulleted or numbered lists
- `matrix` - Grid-based comparisons

---

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
```

---

## Development

```bash
# Clone the repository
git clone https://github.com/your-username/napkin-ai-mcp.git
cd napkin-ai-mcp

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Troubleshooting

### "NAPKIN_API_KEY is required"

Ensure you've set the `NAPKIN_API_KEY` environment variable in your MCP configuration.

### "Storage not configured"

The `generate_and_save` tool requires storage configuration. Add one of the storage configurations above.

### Visual generation times out

Increase `NAPKIN_MAX_WAIT_TIME` (default: 300000ms = 5 minutes).

### Connection issues

1. Ensure Node.js 18+ is installed
2. Check your API key is valid
3. Verify network connectivity to api.napkin.ai

---

## API Reference

- [Napkin AI API Documentation](https://api.napkin.ai/docs)
- [Available Styles](https://api.napkin.ai/docs/styles/index.html)
- [MCP Specification](https://modelcontextprotocol.io)

---

## Licence

MIT

---

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the main repository.
