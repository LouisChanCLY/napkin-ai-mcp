import { z } from "zod";

/**
 * Supported output formats for Napkin AI visual generation.
 */
export const OutputFormatSchema = z.enum(["svg", "png", "ppt"]);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

/**
 * Colour mode for the generated visual.
 * - light: Light theme (default)
 * - dark: Dark theme
 * - both: Generate both light and dark versions
 */
export const ColourModeSchema = z.enum(["light", "dark", "both"]);
export type ColourMode = z.infer<typeof ColourModeSchema>;

/**
 * Orientation hint for the generated visual.
 */
export const OrientationSchema = z.enum(["auto", "horizontal", "vertical", "square"]);
export type Orientation = z.infer<typeof OrientationSchema>;

/**
 * Text extraction mode for processing the content.
 * - auto: Automatically determine the best extraction method (default)
 * - rewrite: Rewrite and optimise the extracted text
 * - preserve: Stay close to the original text
 */
export const TextExtractionModeSchema = z.enum(["auto", "rewrite", "preserve"]);
export type TextExtractionMode = z.infer<typeof TextExtractionModeSchema>;

/**
 * Strategy for sorting visual layouts when multiple options are available.
 * - relevance: Sort by relevance to the content (default)
 * - random: Randomise the order of visual layouts
 */
export const SortStrategySchema = z.enum(["relevance", "random"]);
export type SortStrategy = z.infer<typeof SortStrategySchema>;

/**
 * Request payload for generating a visual with Napkin AI.
 */
export const GenerateVisualRequestSchema = z.object({
  /** Output file format (required). */
  format: OutputFormatSchema,

  /** Main text content to visualise (required). */
  content: z.string().min(1),

  /**
   * Text context related to the main content but not part of the generated visual.
   * This provides additional context to help with visual generation while keeping
   * the visual clean and focused on the main content.
   */
  context: z.string().optional(),

  /**
   * BCP 47 language tag specifying the language of the content.
   * Examples: 'en', 'en-US', 'fr-FR', 'es-ES', 'de-DE', 'ja-JP'
   */
  language: z.string().optional(),

  /**
   * Style identifier. See available styles at:
   * https://api.napkin.ai/docs/styles/index.html
   */
  style_id: z.string().optional(),

  /**
   * Single visual identifier to regenerate a specific visual layout with new content.
   * Cannot be used when number_of_visuals is greater than 1.
   * Cannot be used together with visual_ids, visual_query, or visual_queries.
   */
  visual_id: z.string().optional(),

  /**
   * Array of visual identifiers to regenerate specific visual layouts with new content.
   * The number of IDs must match number_of_visuals.
   * Cannot be used together with visual_id, visual_query, or visual_queries.
   */
  visual_ids: z.array(z.string()).optional(),

  /**
   * Query to search for a specific type of visual layout (e.g., "mindmap", "flowchart", "timeline").
   * Cannot be used when number_of_visuals is greater than 1.
   * Cannot be used together with visual_queries, visual_id, or visual_ids.
   */
  visual_query: z.string().optional(),

  /**
   * Array of queries to search for specific types of visual layouts.
   * The number of queries must match number_of_visuals.
   * Cannot be used together with visual_query, visual_id, or visual_ids.
   */
  visual_queries: z.array(z.string()).optional(),

  /** Number of visual variations to generate (default: 1, max: 4). */
  number_of_visuals: z.number().int().min(1).max(4).optional(),

  /** Whether to use transparent background (default: false). */
  transparent_background: z.boolean().optional(),

  /** Colour mode for the generated visual. */
  color_mode: ColourModeSchema.optional(),

  /**
   * Custom width in pixels. Used for PNG format conversion only.
   * Only one of width or height should be set.
   */
  width: z.number().int().min(100).max(10000).optional(),

  /**
   * Custom height in pixels. Used for PNG format conversion only.
   * Only one of width or height should be set.
   */
  height: z.number().int().min(100).max(10000).optional(),

  /** Orientation hint for the generated visual. */
  orientation: OrientationSchema.optional(),

  /** Text extraction mode for processing the content. */
  text_extraction_mode: TextExtractionModeSchema.optional(),

  /** Strategy for sorting visual layouts when multiple options are available. */
  sort_strategy: SortStrategySchema.optional(),
});

export type GenerateVisualRequest = z.infer<typeof GenerateVisualRequestSchema>;

/**
 * Visual generation status.
 */
export const VisualStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);
export type VisualStatus = z.infer<typeof VisualStatusSchema>;

/**
 * Response from submitting a visual generation request.
 */
export const GenerateVisualResponseSchema = z.object({
  /** Unique request identifier. */
  id: z.string(),

  /** Current status of the request. */
  status: VisualStatusSchema,

  /** Optional warning message. */
  warning: z.string().optional(),
});

export type GenerateVisualResponse = z.infer<typeof GenerateVisualResponseSchema>;

/**
 * Individual generated file information in status response.
 */
export const GeneratedFileSchema = z.object({
  /** Full URL to download the file. */
  url: z.string().url(),

  /** Visual identifier. */
  visual_id: z.string(),

  /** Visual query that was used. */
  visual_query: z.string().optional(),

  /** Style identifier that was used. */
  style_id: z.string().optional(),

  /** Width of the generated visual in pixels. */
  width: z.number().optional(),

  /** Height of the generated visual in pixels. */
  height: z.number().optional(),

  /** Colour mode used. */
  color_mode: z.enum(["light", "dark"]).optional(),
});

export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;

/**
 * Response from checking visual generation status.
 */
export const VisualStatusResponseSchema = z.object({
  /** Unique request identifier. */
  id: z.string(),

  /** Current status of the request. */
  status: VisualStatusSchema,

  /** Request parameters echoed back. */
  request: z.record(z.unknown()).optional(),

  /** List of generated files when completed. */
  generated_files: z.array(GeneratedFileSchema).optional(),

  /** Error message if failed. */
  error: z.string().optional(),
});

export type VisualStatusResponse = z.infer<typeof VisualStatusResponseSchema>;
