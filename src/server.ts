import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { NapkinClient } from "./client.js";
import {
  OutputFormatSchema,
  ColourModeSchema,
  OrientationSchema,
  TextExtractionModeSchema,
  SortStrategySchema,
  GenerateVisualRequest,
} from "./types.js";
import { StorageProvider, createStorageProvider, StorageConfig } from "./storage/index.js";

/**
 * Configuration for the Napkin AI MCP server.
 */
export interface NapkinMcpServerConfig {
  /** Napkin AI API key. */
  napkinApiKey: string;

  /** Napkin AI API base URL. */
  napkinApiBaseUrl?: string;

  /** Storage provider configuration. */
  storage?: StorageConfig;

  /** Default visual generation settings. */
  defaults?: Partial<GenerateVisualRequest>;

  /** Polling interval in milliseconds (default: 2000). */
  pollingInterval?: number;

  /** Maximum wait time in milliseconds (default: 300000). */
  maxWaitTime?: number;
}

/**
 * Creates and configures the Napkin AI MCP server.
 *
 * The server exposes the following tools:
 * - `generate_visual`: Submit a visual generation request
 * - `check_status`: Check the status of a generation request
 * - `download_visual`: Download a completed visual as base64
 * - `generate_and_wait`: Generate a visual and wait for completion
 * - `generate_and_save`: Generate a visual and save to configured storage
 *
 * @param config - Server configuration
 * @returns Configured MCP server
 */
export function createNapkinMcpServer(config: NapkinMcpServerConfig): McpServer {
  const client = new NapkinClient({
    apiKey: config.napkinApiKey,
    baseUrl: config.napkinApiBaseUrl,
  });

  let storageProvider: StorageProvider | undefined;
  if (config.storage) {
    storageProvider = createStorageProvider(config.storage);
  }

  const pollingInterval = config.pollingInterval ?? 2000;
  const maxWaitTime = config.maxWaitTime ?? 300000;
  const defaults = config.defaults ?? {};

  const server = new McpServer({
    name: "napkin-ai",
    version: "0.1.0",
  });

  const CommonInputSchema = {
    content: z.string().min(1).describe("Main text content to visualise"),
    format: OutputFormatSchema.optional().describe(
      "Output format: svg, png, or ppt (default: svg)"
    ),
    context: z.string().optional().describe("Additional context for visual generation"),
    language: z.string().optional().describe("BCP 47 language tag (e.g., en-GB, fr-FR)"),
    style_id: z.string().optional().describe("Style identifier from Napkin AI"),
    visual_query: z
      .string()
      .optional()
      .describe("Visual type query (e.g., mindmap, flowchart, timeline)"),
    number_of_visuals: z
      .number()
      .int()
      .min(1)
      .max(4)
      .optional()
      .describe("Number of variations to generate (1-4)"),
    transparent_background: z.boolean().optional().describe("Use transparent background"),
    color_mode: ColourModeSchema.optional().describe("Colour mode: light, dark, or both"),
    width: z.number().int().min(100).max(10000).optional().describe("Width in pixels (PNG only)"),
    height: z.number().int().min(100).max(10000).optional().describe("Height in pixels (PNG only)"),
    orientation: OrientationSchema.optional().describe(
      "Orientation: auto, horizontal, vertical, or square"
    ),
    text_extraction_mode: TextExtractionModeSchema.optional().describe(
      "Text extraction: auto, rewrite, or preserve"
    ),
    sort_strategy: SortStrategySchema.optional().describe("Sort strategy: relevance or random"),
  };

  server.registerTool(
    "generate_visual",
    {
      title: "Generate Visual",
      description:
        "Submit a visual generation request to Napkin AI. " +
        "Returns a request ID for tracking. Use check_status to poll for completion.",
      inputSchema: CommonInputSchema,
      outputSchema: {
        id: z.string().describe("Request ID for tracking"),
        status: z.string().describe("Initial status (usually 'pending')"),
        warning: z.string().optional().describe("Any warnings from the API"),
      },
    },
    async (input) => {
      const request: GenerateVisualRequest = {
        format: input.format ?? defaults.format ?? "svg",
        content: input.content,
        context: input.context ?? defaults.context,
        language: input.language ?? defaults.language,
        style_id: input.style_id ?? defaults.style_id,
        visual_query: input.visual_query,
        number_of_visuals: input.number_of_visuals,
        transparent_background: input.transparent_background,
        color_mode: input.color_mode ?? defaults.color_mode,
        width: input.width,
        height: input.height,
        orientation: input.orientation ?? defaults.orientation,
        text_extraction_mode: input.text_extraction_mode,
        sort_strategy: input.sort_strategy,
      };

      const response = await client.generate(request);

      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        structuredContent: response,
      };
    }
  );

  server.registerTool(
    "check_status",
    {
      title: "Check Generation Status",
      description:
        "Check the status of a visual generation request. " +
        "Returns progress information and file details when completed.",
      inputSchema: {
        request_id: z.string().describe("Request ID from generate_visual"),
      },
      outputSchema: {
        id: z.string(),
        status: z.string().describe("Current status: pending, processing, completed, or failed"),
        progress: z.number().optional().describe("Progress percentage (0-100)"),
        files: z
          .array(
            z.object({
              id: z.string(),
              format: z.string(),
              visual_id: z.string().optional(),
              color_mode: z.string().optional(),
            })
          )
          .optional()
          .describe("Generated files when completed"),
        error: z.string().optional().describe("Error message if failed"),
        warning: z.string().optional(),
      },
    },
    async ({ request_id }) => {
      const status = await client.getStatus(request_id);

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
        structuredContent: status,
      };
    }
  );

  server.registerTool(
    "download_visual",
    {
      title: "Download Visual",
      description:
        "Download a generated visual file as base64-encoded data. " +
        "Use after check_status shows completed status.",
      inputSchema: {
        request_id: z.string().describe("Request ID from generate_visual"),
        file_id: z.string().describe("File ID from check_status response"),
      },
      outputSchema: {
        content_base64: z.string().describe("Base64-encoded file content"),
        size_bytes: z.number().describe("File size in bytes"),
      },
    },
    async ({ request_id, file_id }) => {
      const buffer = await client.downloadFile(request_id, file_id);
      const base64 = buffer.toString("base64");

      const output = {
        content_base64: base64,
        size_bytes: buffer.length,
      };

      return {
        content: [{ type: "text", text: `Downloaded ${buffer.length} bytes` }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    "generate_and_wait",
    {
      title: "Generate Visual and Wait",
      description:
        "Generate a visual and wait for completion. " +
        "Combines generate_visual and polling check_status into a single operation.",
      inputSchema: CommonInputSchema,
      outputSchema: {
        id: z.string(),
        status: z.string(),
        files: z
          .array(
            z.object({
              id: z.string(),
              format: z.string(),
              visual_id: z.string().optional(),
              color_mode: z.string().optional(),
            })
          )
          .describe("Generated files"),
        warning: z.string().optional(),
      },
    },
    async (input) => {
      const request: GenerateVisualRequest = {
        format: input.format ?? defaults.format ?? "svg",
        content: input.content,
        context: input.context ?? defaults.context,
        language: input.language ?? defaults.language,
        style_id: input.style_id ?? defaults.style_id,
        visual_query: input.visual_query,
        number_of_visuals: input.number_of_visuals,
        transparent_background: input.transparent_background,
        color_mode: input.color_mode ?? defaults.color_mode,
        width: input.width,
        height: input.height,
        orientation: input.orientation ?? defaults.orientation,
        text_extraction_mode: input.text_extraction_mode,
        sort_strategy: input.sort_strategy,
      };

      const status = await client.generateAndWait(request, {
        pollingInterval,
        maxWaitTime,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
        structuredContent: status,
      };
    }
  );

  server.registerTool(
    "generate_and_save",
    {
      title: "Generate Visual and Save",
      description:
        "Generate a visual, wait for completion, and save to configured storage. " +
        "Requires storage to be configured in server settings.",
      inputSchema: {
        ...CommonInputSchema,
        filename: z
          .string()
          .optional()
          .describe("Custom filename (without extension). Auto-generated if not provided."),
      },
      outputSchema: {
        request_id: z.string(),
        files: z
          .array(
            z.object({
              file_id: z.string(),
              storage_location: z.string(),
              public_url: z.string().optional(),
            })
          )
          .describe("Saved files with storage locations"),
      },
    },
    async (input) => {
      if (!storageProvider) {
        throw new Error("Storage not configured. Set storage configuration to use this tool.");
      }

      const format = input.format ?? defaults.format ?? "svg";
      const request: GenerateVisualRequest = {
        format,
        content: input.content,
        context: input.context ?? defaults.context,
        language: input.language ?? defaults.language,
        style_id: input.style_id ?? defaults.style_id,
        visual_query: input.visual_query,
        number_of_visuals: input.number_of_visuals,
        transparent_background: input.transparent_background,
        color_mode: input.color_mode ?? defaults.color_mode,
        width: input.width,
        height: input.height,
        orientation: input.orientation ?? defaults.orientation,
        text_extraction_mode: input.text_extraction_mode,
        sort_strategy: input.sort_strategy,
      };

      const status = await client.generateAndWait(request, {
        pollingInterval,
        maxWaitTime,
      });

      if (!status.files || status.files.length === 0) {
        throw new Error("No files generated");
      }

      const mimeTypes: Record<string, string> = {
        svg: "image/svg+xml",
        png: "image/png",
        ppt: "application/vnd.ms-powerpoint",
      };

      const savedFiles = await Promise.all(
        status.files.map(async (file, index) => {
          const buffer = await client.downloadFile(status.id, file.id);

          const baseFilename = input.filename ?? `napkin-${status.id}`;
          const suffix = status.files!.length > 1 ? `-${index + 1}` : "";
          const colourSuffix = file.color_mode ? `-${file.color_mode}` : "";
          const filename = `${baseFilename}${suffix}${colourSuffix}.${file.format}`;

          const result = await storageProvider!.store({
            content: buffer,
            filename,
            mimeType: mimeTypes[file.format] ?? "application/octet-stream",
            metadata: {
              request_id: status.id,
              file_id: file.id,
              visual_id: file.visual_id,
            },
          });

          return {
            file_id: file.id,
            storage_location: result.location,
            public_url: result.publicUrl,
          };
        })
      );

      const output = {
        request_id: status.id,
        files: savedFiles,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    "list_styles",
    {
      title: "List Available Styles",
      description:
        "Get information about available visual styles. " +
        "Note: For the full list, visit https://api.napkin.ai/docs/styles/index.html",
      inputSchema: {},
      outputSchema: {
        message: z.string(),
        styles_url: z.string(),
      },
    },
    async () => {
      const output = {
        message:
          "Napkin AI offers various visual styles. Visit the styles documentation for the complete list and style IDs.",
        styles_url: "https://api.napkin.ai/docs/styles/index.html",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  return server;
}

/**
 * Starts the MCP server with stdio transport.
 *
 * @param config - Server configuration
 */
export async function startServer(config: NapkinMcpServerConfig): Promise<void> {
  const server = createNapkinMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
