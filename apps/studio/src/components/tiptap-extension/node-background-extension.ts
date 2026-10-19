/* oxlint-disable promise/prefer-await-to-then -- Zod .catch defines synchronous attribute defaults. */
import { hasText } from "@ortodoksas-lt/content/value";
import type { Editor, NodeWithPos } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { z } from "zod";

import { getSelectedNodesOfType, updateNodesAttr } from "@/lib/tiptap-utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeBackground: {
      setNodeBackgroundColor: (backgroundColor: string) => ReturnType;
      unsetNodeBackgroundColor: () => ReturnType;
      toggleNodeBackgroundColor: (backgroundColor: string) => ReturnType;
    };
  }
}

export interface NodeBackgroundOptions {
  /**
   * Node types that should support background colors
   * @default ["paragraph", "heading", "blockquote", "taskList", "bulletList", "orderedList", "tableCell", "tableHeader"]
   */
  types: string[];
  /**
   * Use inline style instead of data attribute
   * @default true
   */
  useStyle?: boolean;
  /**
   * The node attribute that stores the color. Set it to an attribute the
   * node types already define, such as ConvertKit's `background` on table
   * cells, so the color lands where those nodes render and export it.
   * @default "backgroundColor"
   */
  attributeName: string;
}

const DEFAULT_ATTRIBUTE_NAME = "backgroundColor";

/**
 * The attribute the editor's NodeBackground extension writes, for UI that
 * reads the color back. Returns the default when the extension is missing.
 */
export function getNodeBackgroundAttributeName(editor: Editor | null): string {
  const extension = editor?.extensionManager.extensions.find(
    (candidate) => candidate.name === "nodeBackground"
  );

  return z
    .object({ attributeName: z.string().catch(DEFAULT_ATTRIBUTE_NAME) })
    .parse(extension?.options ?? {}).attributeName;
}

/**
 * Determines the target color for toggle operations
 */
function getToggleColor(
  targets: NodeWithPos[],
  attributeName: string,
  inputColor: string
): string | null {
  if (targets.length === 0) {
    return null;
  }

  for (const target of targets) {
    const currentColor: unknown = target.node.attrs[attributeName];

    if (currentColor !== inputColor) {
      return inputColor;
    }
  }

  return null;
}

export const NodeBackground = Extension.create<NodeBackgroundOptions>({
  addCommands() {
    /**
     * Generic command executor for background color operations
     */
    const executeBackgroundCommand =
      (
        getTargetColor: (
          targets: NodeWithPos[],
          inputColor?: string
        ) => string | null
      ) =>
      (inputColor?: string) =>
      ({ state, tr }: { state: EditorState; tr: Transaction }) => {
        const targets = getSelectedNodesOfType(
          state.selection,
          this.options.types
        );

        if (targets.length === 0) {
          return false;
        }

        const targetColor = getTargetColor(targets, inputColor);

        return updateNodesAttr(
          tr,
          targets,
          this.options.attributeName,
          targetColor
        );
      };

    return {
      /**
       * Set background color to specific value
       */
      setNodeBackgroundColor: executeBackgroundCommand((_, inputColor) =>
        hasText(inputColor) ? inputColor : null
      ),

      /**
       * Toggle background color (set if different/missing, unset if all have it)
       */
      toggleNodeBackgroundColor: executeBackgroundCommand(
        (targets, inputColor) =>
          getToggleColor(targets, this.options.attributeName, inputColor ?? "")
      ),

      /**
       * Remove background color
       */
      unsetNodeBackgroundColor: executeBackgroundCommand(() => null),
    };
  },

  addGlobalAttributes() {
    const { attributeName } = this.options;

    return [
      {
        attributes: {
          [attributeName]: {
            default: null,

            parseHTML: (element: HTMLElement) => {
              const styleColor = element.style?.backgroundColor;

              if (styleColor) {
                return styleColor;
              }

              const dataColor = element.dataset.backgroundColor;

              return hasText(dataColor) ? dataColor : null;
            },

            renderHTML: (attributes) => {
              const color = z
                .string()
                .nullable()
                .catch(null)
                .parse(attributes[attributeName]);

              if (!hasText(color)) {
                return {};
              }

              if (this.options.useStyle === true) {
                return {
                  style: `background-color: ${color}`,
                };
              }

              return {
                "data-background-color": color,
              };
            },
          },
        },
        types: this.options.types,
      },
    ];
  },

  addOptions() {
    return {
      attributeName: DEFAULT_ATTRIBUTE_NAME,
      types: [
        "paragraph",
        "heading",
        "blockquote",
        "taskList",
        "bulletList",
        "orderedList",
        "tableCell",
        "tableHeader",
      ],
      useStyle: true,
    };
  },

  name: "nodeBackground",
});
