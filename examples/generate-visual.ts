#!/usr/bin/env npx ts-node
/**
 * Example script demonstrating programmatic usage of the Napkin AI MCP server.
 *
 * Usage:
 *   NAPKIN_API_KEY=your-key npx ts-node examples/generate-visual.ts
 *
 * This script generates a mindmap visualisation and saves it locally.
 */

import { NapkinClient } from "../src/client.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const apiKey = process.env.NAPKIN_API_KEY;

  if (!apiKey) {
    console.error("Error: NAPKIN_API_KEY environment variable is required");
    console.error("Usage: NAPKIN_API_KEY=your-key npx ts-node examples/generate-visual.ts");
    process.exit(1);
  }

  const client = new NapkinClient({ apiKey });

  console.log("Generating visual...");

  const content = `
# The Benefits of Visual Communication

Visual communication helps convey complex information quickly and effectively.

## Key Benefits

- **Faster comprehension**: Visuals are processed 60,000x faster than text
- **Better retention**: People remember 80% of what they see vs 20% of what they read
- **Universal language**: Visuals transcend language barriers
- **Engagement**: Visual content gets 94% more views

## Use Cases

1. Business presentations
2. Educational materials
3. Marketing content
4. Technical documentation
5. Data visualisation
  `.trim();

  try {
    const result = await client.generateAndWait(
      {
        format: "svg",
        content,
        visual_query: "mindmap",
        language: "en-GB",
        color_mode: "light",
      },
      {
        onProgress: (status) => {
          console.log(`Status: ${status.status}`);
        },
      }
    );

    console.log(`\nGeneration completed!`);
    console.log(`Request ID: ${result.id}`);
    console.log(`Files generated: ${result.generated_files?.length ?? 0}`);

    if (result.generated_files && result.generated_files.length > 0) {
      const outputDir = join(process.cwd(), "examples", "output");
      mkdirSync(outputDir, { recursive: true });

      for (const file of result.generated_files) {
        const buffer = await client.downloadFile(file.url);
        const filename = `visual-${file.visual_id}.svg`;
        const filepath = join(outputDir, filename);

        writeFileSync(filepath, buffer);
        console.log(`\nSaved: ${filepath}`);
        console.log(`  Visual ID: ${file.visual_id}`);
        console.log(`  Size: ${buffer.length} bytes`);
      }
    }
  } catch (error) {
    console.error("Error generating visual:", error);
    process.exit(1);
  }
}

main();
