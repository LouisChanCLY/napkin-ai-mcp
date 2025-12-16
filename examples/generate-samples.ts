#!/usr/bin/env npx ts-node
/**
 * Script to generate sample visuals for the README gallery.
 */

import { NapkinClient } from "../src/client.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const samples = [
  {
    name: "mindmap",
    content: `
# Benefits of Visual Communication

Visual communication transforms how we share and understand information.

## Speed
- Processed 60,000x faster than text
- Instant pattern recognition
- Quick decision making

## Retention
- 80% of what we see is remembered
- Only 20% of text is retained
- Visuals create lasting impressions

## Engagement
- 94% more views than text-only
- Higher social sharing rates
- Increased user interaction
    `.trim(),
    query: "mindmap",
  },
  {
    name: "flowchart",
    content: `
# User Registration Flow

1. User clicks "Sign Up" button
2. Enter email address
3. System validates email format
4. If invalid, show error message
5. If valid, send verification email
6. User clicks verification link
7. Create password
8. Validate password strength
9. If weak, prompt for stronger password
10. If strong, create account
11. Redirect to dashboard
12. Show welcome message
    `.trim(),
    query: "flowchart",
  },
  {
    name: "timeline",
    content: `
# History of Artificial Intelligence

## 1950
Alan Turing publishes "Computing Machinery and Intelligence" and proposes the Turing Test.

## 1956
The term "Artificial Intelligence" is coined at the Dartmouth Conference.

## 1997
IBM's Deep Blue defeats world chess champion Garry Kasparov.

## 2011
IBM Watson wins Jeopardy! against human champions.

## 2016
Google DeepMind's AlphaGo defeats Go world champion Lee Sedol.

## 2022
ChatGPT launches, bringing large language models to the mainstream.

## 2023
GPT-4 and Claude demonstrate advanced reasoning capabilities.
    `.trim(),
    query: "timeline",
  },
];

async function main() {
  const apiKey = process.env.NAPKIN_API_KEY;

  if (!apiKey) {
    console.error("Error: NAPKIN_API_KEY required");
    process.exit(1);
  }

  const client = new NapkinClient({ apiKey });
  const outputDir = join(process.cwd(), "examples", "output");
  mkdirSync(outputDir, { recursive: true });

  for (const sample of samples) {
    console.log(`\nGenerating ${sample.name}...`);

    try {
      const result = await client.generateAndWait(
        {
          format: "svg",
          content: sample.content,
          visual_query: sample.query,
          language: "en-GB",
          color_mode: "light",
        },
        {
          onProgress: (status) => {
            process.stdout.write(`  Status: ${status.status}\r`);
          },
        }
      );

      console.log(`  Completed!`);

      if (result.generated_files && result.generated_files.length > 0) {
        const file = result.generated_files[0];
        const buffer = await client.downloadFile(file.url);
        const filepath = join(outputDir, `${sample.name}.svg`);

        writeFileSync(filepath, buffer);
        console.log(`  Saved: ${filepath} (${buffer.length} bytes)`);
      }
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }

  console.log("\nDone!");
}

main();
