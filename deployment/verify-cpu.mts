import fs from "node:fs";

import { z } from "zod";

export const cpuEvidenceSchema = z.object({
  events: z.array(
    z.object({
      cpu: z.number().nonnegative(),
      id: z.string(),
      model: z.enum(["stateless", "durableObject"]),
      outcome: z.string(),
      status: z.number().int().min(200).max(499),
      version: z.string(),
    })
  ),
  requests: z
    .array(
      z.object({
        cache: z.string().nullable(),
        id: z.string(),
        status: z.number().int().min(200).max(499),
      })
    )
    .min(1),
  summary: z.object({ error: z.undefined().optional() }),
});

/** Successful HTTP responses must also fit their execution model's CPU budget. */
export type CpuEvidence = z.infer<typeof cpuEvidenceSchema>;

export function verifyCpuEvidence(report: CpuEvidence, version: string) {
  const deliveries = new Map<string, number>();
  const rendered = new Set<string>();

  for (const event of report.events) {
    if (event.version !== version) {
      throw new Error(`Execution ${event.id} belongs to another deployment.`);
    }

    // Keep the HTTP path below its 10ms ceiling and rendering below 1s of 30s.
    const ceiling = event.model === "stateless" ? 10 : 1000;

    if (event.outcome !== "ok" || event.cpu >= ceiling) {
      throw new Error(`Execution ${event.id} used ${event.cpu}ms CPU.`);
    }

    if (event.model === "stateless") {
      deliveries.set(event.id, event.status);
    } else {
      rendered.add(event.id);
    }
  }

  for (const request of report.requests) {
    if (deliveries.get(request.id) !== request.status) {
      throw new Error(
        `Request ${request.id} lacks matching delivery evidence.`
      );
    }

    if (request.cache === "MISS" && !rendered.has(request.id)) {
      throw new Error(`Request ${request.id} lacks cold-render evidence.`);
    }
  }

  if (!(rendered.size > 0 && report.requests.some((r) => r.cache === "HIT"))) {
    throw new Error(
      "Release evidence must cover cold rendering and cache hits."
    );
  }

  return { deliveries: deliveries.size, renders: rendered.size, version };
}

if (import.meta.main) {
  const [reportPath, version] = process.argv.slice(2);

  if (reportPath === undefined || version === undefined) {
    throw new Error(
      "Usage: pnpm verify:cpu <report.json> <deployed-version-id>"
    );
  }

  const input: unknown = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  console.info(verifyCpuEvidence(cpuEvidenceSchema.parse(input), version));
}
