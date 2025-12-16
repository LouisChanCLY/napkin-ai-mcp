import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNapkinMcpServer, NapkinMcpServerConfig } from "./server.js";

// Mock the NapkinClient
vi.mock("./client.js", () => ({
  NapkinClient: vi.fn().mockImplementation(() => ({
    generate: vi.fn(),
    getStatus: vi.fn(),
    downloadFile: vi.fn(),
    generateAndWait: vi.fn(),
    verifyApiKey: vi.fn(),
  })),
}));

// Mock storage provider
vi.mock("./storage/index.js", () => ({
  createStorageProvider: vi.fn().mockReturnValue({
    store: vi.fn().mockResolvedValue({
      location: "/tmp/test-file.svg",
      publicUrl: "https://example.com/test-file.svg",
    }),
  }),
  StorageConfigSchema: {
    optional: () => ({
      safeParse: () => ({ success: true }),
    }),
  },
}));

describe("createNapkinMcpServer", () => {
  let config: NapkinMcpServerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      napkinApiKey: "test-api-key",
    };
  });

  it("should create an MCP server with correct name and version", () => {
    const server = createNapkinMcpServer(config);
    expect(server).toBeDefined();
  });

  it("should use custom base URL when provided", () => {
    const customConfig: NapkinMcpServerConfig = {
      napkinApiKey: "test-api-key",
      napkinApiBaseUrl: "https://custom.api.napkin.ai",
    };

    const server = createNapkinMcpServer(customConfig);
    expect(server).toBeDefined();
  });

  it("should use custom polling interval when provided", () => {
    const customConfig: NapkinMcpServerConfig = {
      napkinApiKey: "test-api-key",
      pollingInterval: 5000,
    };

    const server = createNapkinMcpServer(customConfig);
    expect(server).toBeDefined();
  });

  it("should use custom max wait time when provided", () => {
    const customConfig: NapkinMcpServerConfig = {
      napkinApiKey: "test-api-key",
      maxWaitTime: 120000,
    };

    const server = createNapkinMcpServer(customConfig);
    expect(server).toBeDefined();
  });

  it("should apply default visual settings", () => {
    const customConfig: NapkinMcpServerConfig = {
      napkinApiKey: "test-api-key",
      defaults: {
        format: "png",
        language: "de",
        color_mode: "dark",
      },
    };

    const server = createNapkinMcpServer(customConfig);
    expect(server).toBeDefined();
  });

  it("should configure storage provider when storage config is provided", () => {
    const customConfig: NapkinMcpServerConfig = {
      napkinApiKey: "test-api-key",
      storage: {
        type: "local",
        directory: "/tmp/napkin",
      },
    };

    const server = createNapkinMcpServer(customConfig);
    expect(server).toBeDefined();
  });
});

describe("NapkinMcpServerConfig", () => {
  it("should accept minimal configuration", () => {
    const config: NapkinMcpServerConfig = {
      napkinApiKey: "test-key",
    };

    expect(config.napkinApiKey).toBe("test-key");
    expect(config.napkinApiBaseUrl).toBeUndefined();
    expect(config.storage).toBeUndefined();
    expect(config.defaults).toBeUndefined();
  });

  it("should accept full configuration", () => {
    const config: NapkinMcpServerConfig = {
      napkinApiKey: "test-key",
      napkinApiBaseUrl: "https://api.example.com",
      storage: {
        type: "local",
        directory: "/tmp/test",
      },
      defaults: {
        format: "svg",
        content: "default content",
        language: "en-GB",
        color_mode: "light",
      },
      pollingInterval: 3000,
      maxWaitTime: 180000,
    };

    expect(config.napkinApiKey).toBe("test-key");
    expect(config.napkinApiBaseUrl).toBe("https://api.example.com");
    expect(config.storage?.type).toBe("local");
    expect(config.defaults?.format).toBe("svg");
    expect(config.pollingInterval).toBe(3000);
    expect(config.maxWaitTime).toBe(180000);
  });
});
