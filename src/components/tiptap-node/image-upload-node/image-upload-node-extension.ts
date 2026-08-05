import type { NodeType } from "@tiptap/pm/model";
import { mergeAttributes, Node, ReactNodeViewRenderer } from "@tiptap/react";
import { ImageUploadNode as ImageUploadNodeComponent } from "@/components/tiptap-node/image-upload-node/image-upload-node";

export interface UploadedMedia {
  altText: string;
  altTextProvenance: "generated" | "manual" | "missing" | "source";
  caption: string;
  captionProvenance: "generated" | "manual" | "missing" | "source";
  height: number | null;
  id: string;
  url: string;
  width: number | null;
}

export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<UploadedMedia>;

export interface ImageUploadNodeOptions {
  /**
   * Acceptable file types for upload.
   * @default 'image/*'
   */
  accept?: string;
  /**
   * HTML attributes to add to the image element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, unknown>;
  /**
   * Maximum number of files that can be uploaded.
   * @default 1
   */
  limit?: number;
  /**
   * Maximum file size in bytes (0 for unlimited).
   * @default 0
   */
  maxSize?: number;
  /**
   * Callback for upload errors.
   */
  onError?: (error: Error) => void;
  /**
   * Callback for successful uploads.
   */
  onSuccess?: (media: UploadedMedia) => void;
  /**
   * The type of the node.
   * @default 'image'
   */
  type?: string | NodeType | undefined;
  /**
   * Function to handle the upload process.
   */
  upload?: UploadFunction;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    imageUpload: {
      setImageUploadNode: (options?: ImageUploadNodeOptions) => ReturnType;
    };
  }
}

/**
 * A Tiptap node extension that creates an image upload component.
 * @see registry/tiptap-node/image-upload-node/image-upload-node
 */
export const ImageUploadNode = Node.create<ImageUploadNodeOptions>({
  addAttributes() {
    return {
      accept: {
        default: this.options.accept,
      },
      limit: {
        default: this.options.limit,
      },
      maxSize: {
        default: this.options.maxSize,
      },
    };
  },

  addCommands() {
    return {
      setImageUploadNode:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: options,
            type: this.name,
          }),
    };
  },

  /**
   * Adds Enter key handler to trigger the upload component when it's selected.
   */
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { nodeAfter } = selection.$from;

        if (
          nodeAfter &&
          nodeAfter.type.name === "imageUpload" &&
          editor.isActive("imageUpload")
        ) {
          const nodeEl = editor.view.nodeDOM(selection.$from.pos);
          if (nodeEl && nodeEl instanceof HTMLElement) {
            // Since NodeViewWrapper is wrapped with a div, we need to click the first child
            const firstChild = nodeEl.firstChild;
            if (firstChild && firstChild instanceof HTMLElement) {
              firstChild.click();
              return true;
            }
          }
        }
        return false;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageUploadNodeComponent);
  },

  addOptions() {
    return {
      accept: "image/*",
      HTMLAttributes: {},
      limit: 1,
      maxSize: 0,
      onError: undefined,
      onSuccess: undefined,
      type: "image",
      upload: undefined,
    };
  },

  atom: true,

  draggable: true,

  group: "block",
  name: "imageUpload",

  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "image-upload" }, HTMLAttributes),
    ];
  },

  selectable: true,
});

export default ImageUploadNode;
