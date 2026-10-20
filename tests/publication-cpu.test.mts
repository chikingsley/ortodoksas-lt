import assert from "node:assert/strict";
import { test } from "node:test";

import { verifyCpuEvidence } from "../deployment/verify-cpu.mts";
import type { CpuEvidence } from "../deployment/verify-cpu.mts";

const evidence = (): CpuEvidence => ({
  events: [
    {
      cpu: 2,
      id: "cold",
      model: "stateless",
      outcome: "ok",
      status: 200,
      version: "release",
    },
    {
      cpu: 40,
      id: "cold",
      model: "durableObject",
      outcome: "ok",
      status: 200,
      version: "release",
    },
    {
      cpu: 1,
      id: "warm",
      model: "stateless",
      outcome: "ok",
      status: 200,
      version: "release",
    },
  ],
  requests: [
    { cache: "MISS", id: "cold", status: 200 },
    { cache: "HIT", id: "warm", status: 200 },
  ],
  summary: {},
});

await test("accepts complete cold and cached evidence for the deployed version", () => {
  assert.deepEqual(verifyCpuEvidence(evidence(), "release"), {
    deliveries: 2,
    renders: 1,
    version: "release",
  });
});

await test("rejects an HTTP 200 response at the free CPU limit", () => {
  const report = evidence();
  report.events = report.events.map((event, index) =>
    index === 0 ? { ...event, cpu: 10 } : event
  );
  assert.throws(() => verifyCpuEvidence(report, "release"), /10ms CPU/u);
});

await test("rejects successful rendering that exhausts its release headroom", () => {
  const report = evidence();
  report.events = report.events.map((event, index) =>
    index === 1 ? { ...event, cpu: 1000 } : event
  );
  assert.throws(() => verifyCpuEvidence(report, "release"), /1000ms CPU/u);
});

await test("requires matching CPU evidence for every delivered request", () => {
  const report = evidence();
  report.events.pop();
  assert.throws(
    () => verifyCpuEvidence(report, "release"),
    /delivery evidence/u
  );
});

await test("requires the cold render event and the current deployed version", () => {
  const report = evidence();
  report.events.splice(1, 1);
  assert.throws(
    () => verifyCpuEvidence(report, "release"),
    /cold-render evidence/u
  );
  assert.throws(
    () => verifyCpuEvidence(evidence(), "old-release"),
    /another deployment/u
  );
});

await test("rejects failed executions even when other requests succeeded", () => {
  const report = evidence();
  report.events = report.events.map((event, index) =>
    index === 0 ? { ...event, outcome: "exceededCpu" } : event
  );
  assert.throws(() => verifyCpuEvidence(report, "release"));
});
