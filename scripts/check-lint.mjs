import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { z } from "zod";

const diagnosticSchema = z.object({
  code: z.string(),
  filename: z.string(),
  labels: z.array(
    z.object({ span: z.object({ line: z.number().optional() }) })
  ),
  message: z.string(),
});

const entrySchema = z.object({
  count: z.number().int().positive(),
  file: z.string(),
  fingerprint: z.string(),
  rule: z.string(),
});

const baseline = z
  .object({ entries: z.array(entrySchema), version: z.literal(1) })
  .parse(
    JSON.parse(
      readFileSync(new URL("../lint-baseline.json", import.meta.url), "utf-8")
    )
  );

const result = spawnSync("pnpm", ["exec", "oxlint", "--format", "json"], {
  encoding: "utf-8",
  maxBuffer: 16 * 1024 * 1024,
});

if (result.error) {
  throw result.error;
}

const report = z
  .object({ diagnostics: z.array(diagnosticSchema) })
  .parse(JSON.parse(result.stdout));

if (result.status !== 0 && report.diagnostics.length === 0) {
  throw new Error(
    result.stderr ?? "Oxlint failed before producing diagnostics"
  );
}

const remaining = new Map(
  baseline.entries.map((entry) => [entry.fingerprint, entry.count])
);

const added = [];

for (const diagnostic of report.diagnostics) {
  const line = diagnostic.labels[0]?.span.line;

  const source =
    line === undefined
      ? ""
      : readFileSync(diagnostic.filename, "utf-8")
          .split("\n")
          .at(line - 1)
          ?.trim();

  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify([
        diagnostic.filename,
        diagnostic.code,
        diagnostic.message,
        source,
      ])
    )
    .digest("hex");

  const count = remaining.get(fingerprint) ?? 0;

  if (count > 0) {
    remaining.set(fingerprint, count - 1);
  } else {
    added.push(diagnostic);
  }
}

for (const diagnostic of added) {
  console.error(
    `${diagnostic.filename}:${diagnostic.labels[0]?.span.line ?? 1} ${
      diagnostic.code
    } ${diagnostic.message}`
  );
}

console.log(
  `Oxlint: ${added.length} new findings; ${
    report.diagnostics.length - added.length
  } recorded migration findings.`
);

if (added.length > 0) {
  process.exitCode = 1;
}
