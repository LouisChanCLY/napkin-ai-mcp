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
        generated_files: [
          {
            url: "https://api.napkin.ai/files/file-1.svg",
            visual_id: "vis-1",
            color_mode: "light",
          },
        ],
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

      const fileUrl = "https://api.napkin.ai/files/file-1.svg";
      const result = await client.downloadFile(fileUrl);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(10);
      expect(mockFetch).toHaveBeenCalledWith(
        fileUrl,
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

      await expect(client.downloadFile("https://api.napkin.ai/files/missing.svg")).rejects.toThrow(
        NapkinApiError
      );
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
          json: () => Promise.resolve({ id: "req-123", status: "processing" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "req-123",
              status: "completed",
              generated_files: [
                { url: "https://api.napkin.ai/files/file-1.svg", visual_id: "vis-1" },
              ],
            }),
        });

      const result = await client.generateAndWait(
        { format: "svg", content: "Test" },
        { pollingInterval: 10 }
      );

      expect(result.status).toBe("completed");
      expect(result.generated_files).toHaveLength(1);
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
          json: () => Promise.resolve({ id: "req-123", status: "processing" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "req-123",
              status: "completed",
              generated_files: [],
            }),
        });

      await client.generateAndWait(
        { format: "svg", content: "Test" },
        { pollingInterval: 10, onProgress }
      );

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: "processing" }));
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
          json: () => Promise.resolve({ id: "req-123", status: "processing" }),
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

  describe("verifyApiKey", () => {
    it("should return valid=true for successful response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await client.verifyApiKey();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.baseUrl).toBe("https://api.test.napkin.ai");
    });

    it("should return valid=true for 404 response (endpoint exists but not found)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await client.verifyApiKey();

      expect(result.valid).toBe(true);
    });

    it("should return valid=false for 401 Unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const result = await client.verifyApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid or expired API key");
    });

    it("should return valid=false for 403 Forbidden", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      const result = await client.verifyApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid or expired API key");
    });

    it("should return valid=false for connection errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.verifyApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Connection failed");
    });
  });

  describe("retry logic", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      mockFetch.mockReset();
    });

    it("should retry on 429 rate limit", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          text: () => Promise.resolve("Rate limited"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "pending" }),
        });

      const promise = client.generate({ format: "svg", content: "Test" });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.id).toBe("req-123");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should retry on 503 Service Unavailable", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          text: () => Promise.resolve("Service down"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "req-123", status: "pending" }),
        });

      const promise = client.generate({ format: "svg", content: "Test" });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.id).toBe("req-123");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 400 Bad Request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("Invalid input"),
      });

      await expect(client.generate({ format: "svg", content: "Test" })).rejects.toThrow(
        NapkinApiError
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should give up after max retries", async () => {
      const failResponse = {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: () => Promise.resolve("Service down"),
      };

      mockFetch
        .mockResolvedValueOnce(failResponse)
        .mockResolvedValueOnce(failResponse)
        .mockResolvedValueOnce(failResponse)
        .mockResolvedValueOnce(failResponse);

      // Wrap in a settled promise pattern to avoid unhandled rejection warnings
      let caughtError: Error | null = null;
      const generatePromise = client.generate({ format: "svg", content: "Test" }).catch((err) => {
        caughtError = err;
      });

      // Run all pending timers to completion
      await vi.runAllTimersAsync();
      await generatePromise;

      expect(caughtError).toBeInstanceOf(NapkinApiError);
      expect((caughtError as NapkinApiError).statusCode).toBe(503);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });
});
