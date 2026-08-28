import type { UploadedMedia } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";

export const MAX_MEDIA_FILE_SIZE = 5 * 1024 * 1024;

export const uploadStudioMedia = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<UploadedMedia> => {
  if (!file) {
    throw new Error("Choose an image to upload");
  }

  if (file.size > MAX_MEDIA_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_MEDIA_FILE_SIZE / (1024 * 1024)}MB)`
    );
  }

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
      const response = request.response as {
        error?: string;
        media?: UploadedMedia;
      } | null;
      if (request.status >= 200 && request.status < 300 && response?.media) {
        resolve(response.media);
        return;
      }
      reject(new Error(response?.error ?? "Image upload failed"));
    });
    request.addEventListener("error", () =>
      reject(new Error("Image upload failed"))
    );
    request.addEventListener("abort", () =>
      reject(new Error("Upload cancelled"))
    );
    abortSignal?.addEventListener("abort", () => request.abort(), {
      once: true,
    });
    request.send(file);
  });
};
