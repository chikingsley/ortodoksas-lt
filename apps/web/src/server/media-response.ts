const mediaCacheControl = "public, max-age=31536000, immutable";

function applyRangeHeaders(
  object: R2Object,
  headers: Headers,
  rangeRequested: boolean
) {
  const { range } = object;
  if (!(rangeRequested && range)) {
    headers.set("content-length", String(object.size));
    return false;
  }
  const suffix = "suffix" in range ? range.suffix : undefined;
  const offset = suffix === undefined && "offset" in range ? range.offset : 0;
  let length = object.size - offset;
  if (suffix !== undefined) {
    length = Math.min(suffix, object.size);
  } else if ("length" in range) {
    const { length: rangeLength } = range;
    length = rangeLength;
  }
  const start = suffix === undefined ? offset : object.size - length;
  headers.set("content-length", String(length));
  headers.set(
    "content-range",
    `bytes ${start}-${start + length - 1}/${object.size}`
  );
  return true;
}

export async function mediaResponse(
  request: Request,
  bucket: R2Bucket,
  key: string
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      headers: { Allow: "GET, HEAD" },
      status: 405,
    });
  }
  if (request.method === "HEAD") {
    const object = await bucket.head(key);
    if (!object) {
      return new Response("Media unavailable", { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("accept-ranges", "bytes");
    headers.set("cache-control", mediaCacheControl);
    headers.set("content-length", String(object.size));
    headers.set("etag", object.httpEtag);
    return new Response(null, { headers });
  }
  const object = await bucket.get(key, {
    onlyIf: request.headers,
    range: request.headers,
  });
  if (!object) {
    return new Response("Media unavailable", { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", mediaCacheControl);
  headers.set("etag", object.httpEtag);
  if (!("body" in object)) {
    return new Response(null, { headers, status: 412 });
  }
  const partial = applyRangeHeaders(
    object,
    headers,
    request.headers.has("range")
  );
  return new Response(object.body, { headers, status: partial ? 206 : 200 });
}
