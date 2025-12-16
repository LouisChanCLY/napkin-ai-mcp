import { describe, it, expect, vi } from "vitest";
import { NapkinClient, NapkinApiError } from "./client.js";
import { createNapkinMcpServer, startServer } from "./server.js";
import { loadConfig, createConfig } from "./config.js";
import {
  OutputFormatSchema,
  ColourModeSchema,
  OrientationSchema,
  GenerateVisualRequestSchema,
  VisualStatusResponseSchema,
} from "./types.js";
import { createStorageProvider, LocalStorageProvider } from "./storage/index.js";

describe("index module exports", () => {
  describe("client exports", () => {
    it("should export NapkinClient class", () => {
      expect(NapkinClient).toBeDefined();
      expect(typeof NapkinClient).toBe("function");
    });

    it("should export NapkinApiError class", () => {
      expect(NapkinApiError).toBeDefined();
      expect(typeof NapkinApiError).toBe("function");
    });

    it("should create NapkinClient instance", () => {
      const client = new NapkinClient({
        apiKey: "test-key",
        fetch: vi.fn(),
      });
      expect(client).toBeInstanceOf(NapkinClient);
    });

    it("should create NapkinApiError instance", () => {
      const error = new NapkinApiError("Test error", 500, "response body");
      expect(error).toBeInstanceOf(NapkinApiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(500);
      expect(error.responseBody).toBe("response body");
    });
  });

  describe("server exports", () => {
    it("should export createNapkinMcpServer function", () => {
      expect(createNapkinMcpServer).toBeDefined();
      expect(typeof createNapkinMcpServer).toBe("function");
    });

    it("should export startServer function", () => {
      expect(startServer).toBeDefined();
      expect(typeof startServer).toBe("function");
    });
  });

  describe("config exports", () => {
    it("should export loadConfig function", () => {
      expect(loadConfig).toBeDefined();
      expect(typeof loadConfig).toBe("function");
    });

    it("should export createConfig function", () => {
      expect(createConfig).toBeDefined();
      expect(typeof createConfig).toBe("function");
    });
  });

  describe("types exports", () => {
    it("should export OutputFormatSchema", () => {
      expect(OutputFormatSchema).toBeDefined();
    });

    it("should export ColourModeSchema", () => {
      expect(ColourModeSchema).toBeDefined();
    });

    it("should export OrientationSchema", () => {
      expect(OrientationSchema).toBeDefined();
    });

    it("should export GenerateVisualRequestSchema", () => {
      expect(GenerateVisualRequestSchema).toBeDefined();
    });

    it("should export VisualStatusResponseSchema", () => {
      expect(VisualStatusResponseSchema).toBeDefined();
    });

    it("should validate output format", () => {
      expect(OutputFormatSchema.safeParse("svg").success).toBe(true);
      expect(OutputFormatSchema.safeParse("png").success).toBe(true);
      expect(OutputFormatSchema.safeParse("ppt").success).toBe(true);
      expect(OutputFormatSchema.safeParse("pdf").success).toBe(false);
    });

    it("should validate colour mode", () => {
      expect(ColourModeSchema.safeParse("light").success).toBe(true);
      expect(ColourModeSchema.safeParse("dark").success).toBe(true);
      expect(ColourModeSchema.safeParse("both").success).toBe(true);
      expect(ColourModeSchema.safeParse("rainbow").success).toBe(false);
    });

    it("should validate orientation", () => {
      expect(OrientationSchema.safeParse("auto").success).toBe(true);
      expect(OrientationSchema.safeParse("horizontal").success).toBe(true);
      expect(OrientationSchema.safeParse("vertical").success).toBe(true);
      expect(OrientationSchema.safeParse("square").success).toBe(true);
      expect(OrientationSchema.safeParse("diagonal").success).toBe(false);
    });
  });

  describe("storage exports", () => {
    it("should export createStorageProvider function", () => {
      expect(createStorageProvider).toBeDefined();
      expect(typeof createStorageProvider).toBe("function");
    });

    it("should export LocalStorageProvider class", () => {
      expect(LocalStorageProvider).toBeDefined();
      expect(typeof LocalStorageProvider).toBe("function");
    });
  });
});

describe("type schema validation", () => {
  describe("GenerateVisualRequestSchema", () => {
    it("should validate minimal request", () => {
      const result = GenerateVisualRequestSchema.safeParse({
        format: "svg",
        content: "Test content",
      });
      expect(result.success).toBe(true);
    });

    it("should validate full request", () => {
      const result = GenerateVisualRequestSchema.safeParse({
        format: "png",
        content: "Test content",
        context: "Additional context",
        language: "en-GB",
        style_id: "STYLE123",
        visual_query: "mindmap",
        number_of_visuals: 2,
        transparent_background: true,
        color_mode: "dark",
        width: 1200,
        height: 800,
        orientation: "horizontal",
        text_extraction_mode: "auto",
        sort_strategy: "relevance",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid format", () => {
      const result = GenerateVisualRequestSchema.safeParse({
        format: "gif",
        content: "Test content",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing content", () => {
      const result = GenerateVisualRequestSchema.safeParse({
        format: "svg",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid number_of_visuals", () => {
      const result = GenerateVisualRequestSchema.safeParse({
        format: "svg",
        content: "Test",
        number_of_visuals: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("VisualStatusResponseSchema", () => {
    it("should validate pending status", () => {
      const result = VisualStatusResponseSchema.safeParse({
        id: "req-123",
        status: "pending",
      });
      expect(result.success).toBe(true);
    });

    it("should validate completed status with files", () => {
      const result = VisualStatusResponseSchema.safeParse({
        id: "req-123",
        status: "completed",
        generated_files: [
          {
            url: "https://api.napkin.ai/files/file-1.svg",
            visual_id: "vis-1",
            color_mode: "light",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should validate failed status with error", () => {
      const result = VisualStatusResponseSchema.safeParse({
        id: "req-123",
        status: "failed",
        error: "Content too short",
      });
      expect(result.success).toBe(true);
    });
  });
});
