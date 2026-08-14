#!/usr/bin/env node

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  createD1CutoverSql,
  createManifest,
  encodeCopySource,
  fileSha256,
  readJson,
  validateCutoverInventory,
  validateManifest,
  validateVerificationReceipt,
  writeJsonAtomic,
} from "./core.mjs";

const [command, ...argumentList] = process.argv.slice(2);

const parseArguments = (values) => {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (!name?.startsWith("--")) {
      throw new Error(`Unexpected argument: ${name}`);
    }
    const value = values[index + 1];
    if (!(value && !value.startsWith("--"))) {
      throw new Error(`Argument ${name} requires a value`);
    }
    parsed.set(name.slice(2), value);
    index += 1;
  }
  return parsed;
};

const argumentsByName = parseArguments(argumentList);
const requiredArgument = (name) => {
  const value = argumentsByName.get(name);
  if (!value) {
    throw new Error(`--${name} is required`);
  }
  return value;
};

const positiveConcurrency = () => {
  const value = Number.parseInt(argumentsByName.get("concurrency") ?? "4", 10);
  if (!(Number.isSafeInteger(value) && value >= 1 && value <= 32)) {
    throw new Error("--concurrency must be between 1 and 32");
  }
  return value;
};

const isNotFound = (error) =>
  error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound";

const requiredEnvironment = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

const r2Connection = () => {
  const accountId = requiredEnvironment("R2_ACCOUNT_ID");
  const bucket = requiredEnvironment("R2_BUCKET_NAME");
  return {
    bucket,
    client: new S3Client({
      credentials: {
        accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY"),
      },
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: "auto",
    }),
  };
};

const loadManifest = async () => {
  const filePath = requiredArgument("manifest");
  return {
    filePath,
    manifest: validateManifest(await readJson(filePath)),
    manifestSha256: await fileSha256(filePath),
  };
};

const streamDigest = async (body) => {
  if (!body) {
    throw new Error("R2 returned an empty object body");
  }
  const hash = createHash("sha256");
  let byteSize = 0;
  for await (const chunk of body) {
    hash.update(chunk);
    byteSize += chunk.byteLength;
  }
  return { byteSize, sha256: hash.digest("hex") };
};

const verifyObject = async (client, bucket, key, expected) => {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const actual = await streamDigest(response.Body);
  if (
    actual.byteSize !== expected.byteSize ||
    actual.sha256 !== expected.sha256
  ) {
    throw new Error(`Object verification failed for ${key}`);
  }
  return actual;
};

const inBatches = async (items, concurrency, operation, onBatch) => {
  for (let index = 0; index < items.length; index += concurrency) {
    // A completed batch is checkpointed before the next batch starts so an
    // interrupted production migration resumes from durable evidence.
    // biome-ignore lint/performance/noAwaitInLoops: ordered checkpoints are the safety boundary
    const results = await Promise.all(
      items.slice(index, index + concurrency).map(operation)
    );
    await onBatch(results, Math.min(index + concurrency, items.length));
  }
};

const runManifest = async () => {
  const inventory = await readJson(requiredArgument("inventory"));
  const output = requiredArgument("output");
  const manifest = createManifest(inventory);
  await writeJsonAtomic(output, manifest);
  process.stdout.write(
    `Wrote ${manifest.items.length} media items to ${output}\n`
  );
};

const runPlan = async () => {
  const { manifest, manifestSha256 } = await loadManifest();
  const summary = {
    bytes: manifest.items.reduce((total, item) => total + item.byteSize, 0),
    destinations: manifest.destinationPrefix,
    items: manifest.items.length,
    manifestSha256,
    sourcePrefixes: manifest.sourcePrefixes,
  };
  const output = argumentsByName.get("output");
  if (output) {
    await writeJsonAtomic(output, summary);
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};

const runCopy = async () => {
  const { manifest, manifestSha256 } = await loadManifest();
  const checkpointPath = requiredArgument("checkpoint");
  const { bucket, client } = r2Connection();
  const prior = await readJson(checkpointPath).catch(() => ({ items: [] }));
  if (prior.manifestSha256 && prior.manifestSha256 !== manifestSha256) {
    throw new Error("Copy checkpoint belongs to another manifest");
  }
  const completed = new Map((prior.items ?? []).map((item) => [item.id, item]));
  const priorCount = completed.size;
  const remaining = manifest.items.filter((item) => !completed.has(item.id));
  await inBatches(
    remaining,
    positiveConcurrency(),
    async (item) => {
      const destination = await client
        .send(
          new HeadObjectCommand({ Bucket: bucket, Key: item.destinationKey })
        )
        .catch((error) => (isNotFound(error) ? null : Promise.reject(error)));
      if (destination) {
        await verifyObject(client, bucket, item.destinationKey, item);
        return { id: item.id, result: "reused-verified" };
      }
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: encodeCopySource(bucket, item.sourceKey),
          Key: item.destinationKey,
          MetadataDirective: "COPY",
        })
      );
      await verifyObject(client, bucket, item.destinationKey, item);
      return { id: item.id, result: "copied-verified" };
    },
    async (results, processed) => {
      for (const result of results) {
        completed.set(result.id, result);
      }
      await writeJsonAtomic(checkpointPath, {
        items: [...completed.values()].sort((left, right) =>
          left.id.localeCompare(right.id)
        ),
        manifestSha256,
        updatedAt: new Date().toISOString(),
        version: 1,
      });
      process.stdout.write(
        `Copied or reused ${processed + priorCount}/${manifest.items.length}\n`
      );
    }
  );
};

const runVerify = async () => {
  const { manifest, manifestSha256 } = await loadManifest();
  const output = requiredArgument("output");
  const { bucket, client } = r2Connection();
  const verified = [];
  await inBatches(
    manifest.items,
    positiveConcurrency(),
    async (item) => {
      await verifyObject(client, bucket, item.destinationKey, item);
      return {
        byteSize: item.byteSize,
        destinationKey: item.destinationKey,
        id: item.id,
        sha256: item.sha256,
        verified: true,
      };
    },
    (results, processed) => {
      verified.push(...results);
      process.stdout.write(`Verified ${processed}/${manifest.items.length}\n`);
    }
  );
  await writeJsonAtomic(output, {
    items: verified.sort((left, right) => left.id.localeCompare(right.id)),
    manifestSha256,
    verifiedAt: new Date().toISOString(),
    version: 1,
  });
};

const runD1Sql = async () => {
  const { manifest, manifestSha256 } = await loadManifest();
  const receipt = await readJson(requiredArgument("verification"));
  validateVerificationReceipt(manifest, receipt, manifestSha256);
  const output = requiredArgument("output");
  await writeFile(output, createD1CutoverSql(manifest, manifestSha256), {
    mode: 0o600,
  });
  process.stdout.write(`Wrote gated D1 cutover SQL to ${output}\n`);
};

const runDeleteSource = async () => {
  if (requiredArgument("confirm") !== "DELETE_VERIFIED_SOURCES") {
    throw new Error("--confirm must equal DELETE_VERIFIED_SOURCES");
  }
  const { manifest, manifestSha256 } = await loadManifest();
  validateVerificationReceipt(
    manifest,
    await readJson(requiredArgument("verification")),
    manifestSha256
  );
  validateCutoverInventory(
    manifest,
    await readJson(requiredArgument("cutover-inventory"))
  );
  const checkpointPath = requiredArgument("checkpoint");
  const { bucket, client } = r2Connection();
  const prior = await readJson(checkpointPath).catch(() => ({ items: [] }));
  if (prior.manifestSha256 && prior.manifestSha256 !== manifestSha256) {
    throw new Error("Delete checkpoint belongs to another manifest");
  }
  const completed = new Map((prior.items ?? []).map((item) => [item.id, item]));
  const priorCount = completed.size;
  const remaining = manifest.items.filter((item) => !completed.has(item.id));
  await inBatches(
    remaining,
    positiveConcurrency(),
    async (item) => {
      await verifyObject(client, bucket, item.destinationKey, item);
      await verifyObject(client, bucket, item.sourceKey, item);
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: item.sourceKey })
      );
      await client
        .send(new HeadObjectCommand({ Bucket: bucket, Key: item.sourceKey }))
        .then(
          () => {
            throw new Error(
              `Source still exists after deletion: ${item.sourceKey}`
            );
          },
          (error) => {
            if (!isNotFound(error)) {
              throw error;
            }
          }
        );
      return { deleted: true, id: item.id, sourceKey: item.sourceKey };
    },
    async (results, processed) => {
      for (const result of results) {
        completed.set(result.id, result);
      }
      await writeJsonAtomic(checkpointPath, {
        items: [...completed.values()].sort((left, right) =>
          left.id.localeCompare(right.id)
        ),
        manifestSha256,
        updatedAt: new Date().toISOString(),
        version: 1,
      });
      process.stdout.write(
        `Deleted ${processed + priorCount}/${manifest.items.length} verified sources\n`
      );
    }
  );
};

const commands = {
  copy: runCopy,
  "d1-sql": runD1Sql,
  "delete-source": runDeleteSource,
  manifest: runManifest,
  plan: runPlan,
  verify: runVerify,
};

if (commands[command]) {
  await commands[command]().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
} else {
  process.stderr.write(
    "Usage: media-originals <manifest|plan|copy|verify|d1-sql|delete-source> [options]\n"
  );
  process.exitCode = 2;
}
