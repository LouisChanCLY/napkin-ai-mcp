import {
  GenerateVisualRequest,
  GenerateVisualResponse,
  GenerateVisualResponseSchema,
  VisualStatusResponse,
  VisualStatusResponseSchema,
} from "./types.js";

/**
 * Default base URL for the Napkin AI API.
 */
const DEFAULT_BASE_URL = "https://api.napkin.ai";

/**
 * Error thrown when a Napkin AI API request fails.
 */
export class NapkinApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "NapkinApiError";
  }
}

/**
 * Options for creating a NapkinClient.
 */
export interface NapkinClientOptions {
  /** Napkin AI API key. */
  apiKey: string;

  /** Base URL for the API (default: https://api.napkin.ai). */
  baseUrl?: string;

  /** Custom fetch implementation for testing. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Client for interacting with the Napkin AI API.
 *
 * The Napkin AI API is asynchronous - visual generation is submitted and then
 * polled for completion. This client provides methods for both the individual
 * API calls and a convenience method that handles the full workflow.
 *
 * @example
 * ```typescript
 * const client = new NapkinClient({ apiKey: "your-api-key" });
 *
 * // Generate a visual and wait for completion
 * const result = await client.generateAndWait({
 *   format: "svg",
 *   content: "# My Visual\n\n- Point 1\n- Point 2\n- Point 3",
 * });
 *
 * // Download the generated file
 * const fileBuffer = await client.downloadFile(result.id, result.files[0].id);
 * ```
 */
export class NapkinClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(options: NapkinClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Makes an authenticated request to the Napkin AI API.
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetchFn(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new NapkinApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        responseBody
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Submits a visual generation request to Napkin AI.
   *
   * This initiates an asynchronous generation process. Use {@link getStatus}
   * to poll for completion, or use {@link generateAndWait} for a simpler
   * workflow.
   *
   * @param request - The visual generation request parameters
   * @returns The generation response with request ID and initial status
   */
  async generate(request: GenerateVisualRequest): Promise<GenerateVisualResponse> {
    const response = await this.request<unknown>("POST", "/v1/visual", request);
    const parsed = GenerateVisualResponseSchema.safeParse(response);

    if (!parsed.success) {
      throw new NapkinApiError(
        `Invalid API response: ${parsed.error.message}`,
        undefined,
        JSON.stringify(response)
      );
    }

    return parsed.data;
  }

  /**
   * Gets the current status of a visual generation request.
   *
   * @param requestId - The request ID from {@link generate}
   * @returns The current status including progress and file information
   */
  async getStatus(requestId: string): Promise<VisualStatusResponse> {
    const response = await this.request<unknown>("GET", `/v1/visual/${requestId}/status`);
    const parsed = VisualStatusResponseSchema.safeParse(response);

    if (!parsed.success) {
      throw new NapkinApiError(
        `Invalid API response: ${parsed.error.message}`,
        undefined,
        JSON.stringify(response)
      );
    }

    return parsed.data;
  }

  /**
   * Downloads a generated visual file from a URL.
   *
   * @param fileUrl - The full URL from the generated_files array
   * @returns The file contents as a Buffer
   */
  async downloadFile(fileUrl: string): Promise<Buffer> {
    const response = await this.fetchFn(fileUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new NapkinApiError(
        `Failed to download file: ${response.status} ${response.statusText}`,
        response.status,
        responseBody
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generates a visual and waits for completion.
   *
   * This is a convenience method that handles the full async workflow:
   * 1. Submits the generation request
   * 2. Polls for status until completion or failure
   * 3. Returns the final status with file information
   *
   * @param request - The visual generation request parameters
   * @param options - Polling options
   * @returns The completed status response with file information
   * @throws NapkinApiError if generation fails or times out
   */
  async generateAndWait(
    request: GenerateVisualRequest,
    options: {
      /** Polling interval in milliseconds (default: 2000). */
      pollingInterval?: number;
      /** Maximum wait time in milliseconds (default: 300000 = 5 minutes). */
      maxWaitTime?: number;
      /** Callback for progress updates. */
      onProgress?: (status: VisualStatusResponse) => void;
    } = {}
  ): Promise<VisualStatusResponse> {
    const pollingInterval = options.pollingInterval ?? 2000;
    const maxWaitTime = options.maxWaitTime ?? 300000;

    const response = await this.generate(request);
    const startTime = Date.now();

    while (true) {
      const status = await this.getStatus(response.id);

      if (options.onProgress) {
        options.onProgress(status);
      }

      if (status.status === "completed") {
        return status;
      }

      if (status.status === "failed") {
        throw new NapkinApiError(
          `Visual generation failed: ${status.error ?? "Unknown error"}`,
          undefined,
          JSON.stringify(status)
        );
      }

      if (Date.now() - startTime > maxWaitTime) {
        throw new NapkinApiError(
          `Visual generation timed out after ${maxWaitTime}ms`,
          undefined,
          JSON.stringify(status)
        );
      }

      await this.sleep(pollingInterval);
    }
  }

  /**
   * Sleeps for the specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
