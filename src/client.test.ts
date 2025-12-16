import { describe, it, expect, vi, beforeEach } from "vitest";
import { NapkinClient, NapkinApiError } from "./client.js";

describe("NapkinClient", () => {
  const mockFetch = vi.fn();
  let client: NapkinClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new NapkinClient({
      apiKey: "test-api-key",
      baseUrl: "https://api.test.napkin.ai",
      fetch: mockFetch,
    });
  });

  describe("generate", () => {
    it("should submit a visual generation request", async () => {
      const mockResponse = {
        id: "req-123",
        status: "pending",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.generate({
        format: "svg",
        content: "Test content",
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.napkin.ai/v1/visual",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            format: "svg",
            content: "Test content",
          }),
        })
      );
    });

    it("should throw NapkinApiError on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("Invalid API key"),
      });

      await expect(client.generate({ format: "svg", content: "Test" })).rejects.toThrow(
        NapkinApiError
      );
    });

    it("should include optional parameters in request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "req-123", status: "pending" }),
      });

      await client.generate({
        format: "png",
        content: "Test content",
        context: "Additional context",
        language: "en-GB",
        style_id: "STYLE123",
        color_mode: "dark",
        orientation: "horizontal",
        number_of_visuals: 2,
        transparent_background: true,
        width: 1200,
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(callBody).toMatchObject({
        format: "png",
        content: "Test content",
        context: "Additional context",
        language: "en-GB",
        style_id: "STYLE123",
        color_mode: "dark",
        orientation: "horizontal",
        number_of_visuals: 2,
        transparent_background: true,
        width: 1200,
      });
    });
  });

  describe("getStatus", () => {
    it("should fetch the status of a request", async () => {
      const mockStatus = {
        id: "req-123",
        status: "completed",
        progress: 100,
        files: [{ id: "file-1", format: "svg", visual_id: "vis-1" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      const result = await client.getStatus("req-123");

      expect(result).toEqual(mockStatus);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.napkin.ai/v1/visual/req-123/status",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer test-api-key",
          },
        })
      );
    });

    it("should handle failed status", async () => {
      const mockStatus = {
        id: "req-123",
        status: "failed",
        error: "Content too short",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      const result = await client.getStatus("req-123");

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Content too short");
    });
  });

  describe("downloadFile", () => {
    it("should download file content as Buffer", async () => {
      const mockContent = new ArrayBuffer(10);
      const view = new Uint8Array(mockContent);
      view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockContent),
      });

      const result = await client.downloadFile("req-123", "file-1");

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(10);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.napkin.ai/v1/visual/req-123/file/file-1",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer test-api-key",
          },
        })
      );
    });

    it("should throw on download failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: () => Promise.resolve("File not found"),
      });

      await expect(client.downloadFile("req-123", "file-1")).rejects.toThrow(NapkinApiError);
    });
  });

  describe("generateAndWait", () => {
    it("should poll until completion", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "pending" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "processing", progress: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "req-123",
              status: "completed",
              progress: 100,
              files: [{ id: "file-1", format: "svg" }],
            }),
        });

      const result = await client.generateAndWait(
        { format: "svg", content: "Test" },
        { pollingInterval: 10 }
      );

      expect(result.status).toBe("completed");
      expect(result.files).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should call onProgress callback", async () => {
      const onProgress = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "pending" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "processing", progress: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "req-123",
              status: "completed",
              progress: 100,
              files: [],
            }),
        });

      await client.generateAndWait(
        { format: "svg", content: "Test" },
        { pollingInterval: 10, onProgress }
      );

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: "processing", progress: 50 })
      );
    });

    it("should throw on generation failure", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "pending" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "req-123",
              status: "failed",
              error: "Invalid content",
            }),
        });

      await expect(
        client.generateAndWait({ format: "svg", content: "Test" }, { pollingInterval: 10 })
      ).rejects.toThrow("Visual generation failed: Invalid content");
    });

    it("should throw on timeout", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "pending" }),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "processing", progress: 10 }),
        });

      await expect(
        client.generateAndWait(
          { format: "svg", content: "Test" },
          { pollingInterval: 10, maxWaitTime: 50 }
        )
      ).rejects.toThrow(/timed out/);
    });
  });

  describe("constructor", () => {
    it("should use default base URL", () => {
      const defaultClient = new NapkinClient({
        apiKey: "test-key",
        fetch: mockFetch,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "req-123", status: "pending" }),
      });

      defaultClient.generate({ format: "svg", content: "Test" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.napkin.ai"),
        expect.anything()
      );
    });

    it("should strip trailing slash from base URL", () => {
      const clientWithSlash = new NapkinClient({
        apiKey: "test-key",
        baseUrl: "https://api.test.napkin.ai/",
        fetch: mockFetch,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "req-123", status: "pending" }),
      });

      clientWithSlash.generate({ format: "svg", content: "Test" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.napkin.ai/v1/visual",
        expect.anything()
      );
    });
  });
});
