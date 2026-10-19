import { z } from "zod";

import type { UploadedMedia } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";

const provenanceSchema = z.enum(["generated", "manual", "missing", "source"]);

const uploadResponseSchema = z.object({
  media: z.object({
    altText: z.string(),
    altTextProvenance: provenanceSchema,
    caption: z.string(),
    captionProvenance: provenanceSchema,
    height: z.number().nullable(),
    id: z.string().min(1),
    url: z.string().startsWith("/api/media/"),
    width: z.number().nullable(),
  }),
});

const uploadErrorSchema = z.object({ error: z.string().min(1) });

export const MAX_MEDIA_FILE_SIZE = 5 * 1024 * 1024;

export const uploadStudioMedia = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<UploadedMedia> => {
  abortSignal?.throwIfAborted();

  if (file.size > MAX_MEDIA_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_MEDIA_FILE_SIZE / (1024 * 1024)}MB)`
    );
  }

  // oxlint-disable-next-line promise/avoid-new -- XMLHttpRequest exposes upload progress through events.
  return await new Promise<UploadedMedia>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/media");
    request.responseType = "json";
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("x-file-name", encodeURIComponent(file.name));

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress?.({
          progress: Math.round((event.loaded / event.total) * 100),
        });
      }
    });
    request.addEventListener("load", () => {
      const response = uploadResponseSchema.safeParse(request.response);

      if (request.status >= 200 && request.status < 300 && response.success) {
        resolve(response.data.media);

        return;
      }

      const failure = uploadErrorSchema.safeParse(request.response);
      reject(
        new Error(failure.success ? failure.data.error : "Image upload failed")
      );
    });
    request.addEventListener("error", () => {
      reject(new Error("Image upload failed"));
    });
    request.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    const abort = () => {
      request.abort();
    };

    abortSignal?.addEventListener("abort", abort, { once: true });
    request.addEventListener(
      "loadend",
      () => {
        abortSignal?.removeEventListener("abort", abort);
      },
      { once: true }
    );
    request.send(file);
  });
};
