import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  createD1CutoverSql,
  createManifest,
  encodeCopySource,
  validateCutoverInventory,
  validateManifest,
  validateVerificationReceipt,
} from "../src/core.mjs";

const digest = "a".repeat(64);
const ALIAS_CLEANUP_PATTERN = /alias = '\/api\/media\/' \|\| media_id/u;
const D1_GATE_PATTERN = /CHECK \(mismatch_count = 0\)/u;
const IDEMPOTENT_KEY_PATTERN =
  /r2_key NOT IN \(plan\.source_key, plan\.destination_key\)/u;
const SOURCE_UPDATE_PATTERN = /media_assets\.r2_key = plan\.source_key/u;
const inventory = [
  {
    byte_size: 123,
    id: "media_a",
    mime_type: "image/jpeg",
    r2_key: "archive/portrait original.jpeg",
    sha256: digest,
  },
];

test("creates a deterministic canonical originals manifest from Wrangler output", () => {
  const manifest = createManifest(
    [{ results: inventory }],
    "2026-08-14T00:00:00.000Z"
  );
  assert.deepEqual(manifest.items, [
    {
      byteSize: 123,
      destinationKey: `media/originals/${digest}.jpg`,
      id: "media_a",
      mimeType: "image/jpeg",
      sha256: digest,
      sourceKey: "archive/portrait original.jpeg",
    },
  ]);
  assert.deepEqual(manifest.sourcePrefixes, ["archive/"]);
  assert.equal(validateManifest(manifest), manifest);
});

test("rejects invalid and colliding inventory", () => {
  assert.throws(() => createManifest([{ ...inventory[0], sha256: "short" }]));
  assert.throws(() =>
    createManifest([...inventory, { ...inventory[0], id: "media_b" }])
  );
});

test("skips assets that already use their canonical originals key", () => {
  const manifest = createManifest([
    ...inventory,
    {
      byte_size: 123,
      id: "media_complete",
      mime_type: "image/jpeg",
      r2_key: `media/originals/${"b".repeat(64)}.jpg`,
      sha256: "b".repeat(64),
    },
  ]);
  assert.deepEqual(
    manifest.items.map((item) => item.id),
    ["media_a"]
  );
});

test("requires complete verification and cutover evidence", () => {
  const manifest = createManifest(inventory, "2026-08-14T00:00:00.000Z");
  const [item] = manifest.items;
  const receipt = {
    items: [{ ...item, verified: true }],
    manifestSha256: "manifest-hash",
    version: 1,
  };
  assert.equal(
    validateVerificationReceipt(manifest, receipt, "manifest-hash"),
    receipt
  );
  assert.throws(() =>
    validateVerificationReceipt(manifest, receipt, "another-hash")
  );
  assert.doesNotThrow(() =>
    validateCutoverInventory(manifest, [
      { id: item.id, r2_key: item.destinationKey, sha256: item.sha256 },
    ])
  );
  assert.throws(() => validateCutoverInventory(manifest, inventory));
});

test("generates idempotent gated D1 SQL and canonical alias cleanup", () => {
  const manifest = createManifest(inventory, "2026-08-14T00:00:00.000Z");
  const sql = createD1CutoverSql(manifest, "manifest-hash");
  assert.match(sql, D1_GATE_PATTERN);
  assert.match(sql, IDEMPOTENT_KEY_PATTERN);
  assert.match(sql, SOURCE_UPDATE_PATTERN);
  assert.match(sql, ALIAS_CLEANUP_PATTERN);

  const database = new DatabaseSync(":memory:");
  database.exec(
    "CREATE TABLE media_assets (id TEXT PRIMARY KEY, r2_key TEXT NOT NULL, sha256 TEXT); CREATE TABLE media_aliases (alias TEXT PRIMARY KEY, media_id TEXT NOT NULL);"
  );
  database
    .prepare("INSERT INTO media_assets (id, r2_key, sha256) VALUES (?, ?, ?)")
    .run("media_a", "archive/portrait original.jpeg", digest);
  database
    .prepare("INSERT INTO media_aliases (alias, media_id) VALUES (?, ?)")
    .run("/api/media/media_a", "media_a");
  database.exec(sql);
  database.exec(sql);
  assert.equal(
    database.prepare("SELECT r2_key FROM media_assets").get().r2_key,
    `media/originals/${digest}.jpg`
  );
  assert.deepEqual(
    database.prepare("SELECT alias FROM media_aliases").all(),
    []
  );
  database.close();
});

test("D1 SQL gate rejects an inventory digest mismatch before updating", () => {
  const manifest = createManifest(inventory, "2026-08-14T00:00:00.000Z");
  const database = new DatabaseSync(":memory:");
  database.exec(
    "CREATE TABLE media_assets (id TEXT PRIMARY KEY, r2_key TEXT NOT NULL, sha256 TEXT); CREATE TABLE media_aliases (alias TEXT PRIMARY KEY, media_id TEXT NOT NULL);"
  );
  database
    .prepare("INSERT INTO media_assets (id, r2_key, sha256) VALUES (?, ?, ?)")
    .run("media_a", "archive/portrait original.jpeg", null);
  assert.throws(() =>
    database.exec(createD1CutoverSql(manifest, "manifest-hash"))
  );
  assert.equal(
    database.prepare("SELECT r2_key FROM media_assets").get().r2_key,
    "archive/portrait original.jpeg"
  );
  database.close();
});

test("encodes CopyObject source keys by path segment", () => {
  assert.equal(
    encodeCopySource("media bucket", "archive/a name+#.jpg"),
    "media%20bucket/archive/a%20name%2B%23.jpg"
  );
});
