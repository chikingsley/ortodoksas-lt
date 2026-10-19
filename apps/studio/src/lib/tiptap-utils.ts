import { hasText } from "@ortodoksas-lt/content/value";
import type { LinkOptions } from "@tiptap/extension-link";
import { isAllowedUri } from "@tiptap/extension-link";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import {
  AllSelection,
  NodeSelection,
  Selection,
  TextSelection,
} from "@tiptap/pm/state";
import { CellSelection, cellAround } from "@tiptap/pm/tables";
import type { Editor, NodeWithPos } from "@tiptap/react";
import { findParentNodeClosestToPos } from "@tiptap/react";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";

export const MAC_SYMBOLS = new Map<string, string>(
  Object.entries({
    alt: "⌥",
    backspace: "Del",
    capslock: "⇪",
    command: "⌘",
    control: "⌃",
    ctrl: "⌃",
    delete: "⌦",
    enter: "⏎",
    escape: "⎋",
    meta: "⌘",
    mod: "⌘",
    option: "⌥",
    shift: "⇧",
  })
);

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Determines if the current platform is macOS
 * @returns boolean indicating if the current platform is Mac
 */
export function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  );
}

/**
 * Formats a shortcut key based on the platform (Mac or non-Mac)
 * @param key - The key to format (e.g., "ctrl", "alt", "shift")
 * @param macPlatform - Boolean indicating if the platform is Mac
 * @param capitalize - Whether to capitalize the key (default: true)
 * @returns Formatted shortcut key symbol
 */
export const formatShortcutKey = (
  key: string,
  macPlatform: boolean,
  capitalize = true
) => {
  if (macPlatform) {
    const lowerKey = key.toLowerCase();

    return MAC_SYMBOLS.get(lowerKey) ?? (capitalize ? key.toUpperCase() : key);
  }

  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key;
};

/**
 * Parses a shortcut key string into an array of formatted key symbols
 * @param shortcutKeys - The string of shortcut keys (e.g., "ctrl-alt-shift")
 * @param delimiter - The delimiter used to split the keys (default: "-")
 * @param capitalize - Whether to capitalize the keys (default: true)
 * @returns Array of formatted shortcut key symbols
 */
export const parseShortcutKeys = (props: {
  shortcutKeys: string | undefined;
  delimiter?: string;
  capitalize?: boolean;
}) => {
  const { shortcutKeys, delimiter = "+", capitalize = true } = props;

  if (!hasText(shortcutKeys)) {
    return [];
  }

  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac(), capitalize));
};

/**
 * Checks if a mark exists in the editor schema
 * @param markName - The name of the mark to check
 * @param editor - The editor instance
 * @returns boolean indicating if the mark exists in the schema
 */
export const isMarkInSchema = (
  markName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) {
    return false;
  }

  return editor.schema.spec.marks.get(markName) !== undefined;
};

/**
 * Checks if a node exists in the editor schema
 * @param nodeName - The name of the node to check
 * @param editor - The editor instance
 * @returns boolean indicating if the node exists in the schema
 */
export const isNodeInSchema = (
  nodeName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) {
    return false;
  }

  return editor.schema.spec.nodes.get(nodeName) !== undefined;
};

/**
 * Moves the focus to the next node in the editor
 * @param editor - The editor instance
 * @returns boolean indicating if the focus was moved
 */
export function focusNextNode(editor: Editor) {
  const { state, view } = editor;
  const { doc, selection } = state;

  const nextSel = Selection.findFrom(selection.$to, 1, true);

  if (nextSel) {
    view.dispatch(state.tr.setSelection(nextSel).scrollIntoView());

    return true;
  }

  const paragraphType = state.schema.nodes.paragraph;

  if (!paragraphType) {
    console.warn("No paragraph node type found in schema.");

    return false;
  }

  const end = doc.content.size;
  const para = paragraphType.create();
  let tr = state.tr.insert(end, para);

  // Place the selection inside the new paragraph
  const $inside = tr.doc.resolve(end + 1);
  tr = tr.setSelection(TextSelection.near($inside)).scrollIntoView();
  view.dispatch(tr);

  return true;
}

/**
 * Checks if a value is a valid number (not null, undefined, or NaN)
 * @param value - The value to check
 * @returns boolean indicating if the value is a valid number
 */
export function isValidPosition(pos: number | null | undefined): pos is number {
  return pos !== null && pos !== undefined && Number.isFinite(pos) && pos >= 0;
}

/**
 * Checks if one or more extensions are registered in the Tiptap editor.
 * @param editor - The Tiptap editor instance
 * @param extensionNames - A single extension name or an array of names to check
 * @returns True if at least one of the extensions is available, false otherwise
 */
// This check runs from render/selection paths, so an absent extension would
// otherwise repeat the hint on every update — remember what was already
// reported and say it once.
const warnedMissingExtensions = new Set<string>();

export function isExtensionAvailable(
  editor: Editor | null,
  extensionNames: string | string[],
  options?: {
    /**
     * Skip the missing-extension console hint. Pass `true` when absence is a
     * supported state the caller handles gracefully (e.g. a
     * `hideWhenUnavailable` button probing whether to render at all) rather
     * than a configuration mistake worth flagging.
     */
    silent?: boolean;
  }
): boolean {
  if (!editor || editor.isDestroyed) {
    return false;
  }

  const names = Array.isArray(extensionNames)
    ? extensionNames
    : [extensionNames];

  const { extensions } = editor.extensionManager;

  const found = names.some((name) =>
    extensions.some((ext) => ext.name === name)
  );

  if (!found && options?.silent !== true) {
    const key = names.join(", ");

    if (!warnedMissingExtensions.has(key)) {
      warnedMissingExtensions.add(key);
      console.warn(
        `None of the extensions [${key}] were found in the editor schema. Ensure they are included in the editor configuration.`
      );
    }
  }

  return found;
}

/**
 * Finds a node at the specified position with error handling
 * @param editor The Tiptap editor instance
 * @param position The position in the document to find the node
 * @returns The node at the specified position, or null if not found
 */
export function findNodeAtPosition(editor: Editor, position: number) {
  try {
    const node = editor.state.doc.nodeAt(position);

    if (!node) {
      console.warn(`No node found at position ${position}`);

      return null;
    }

    return node;
  } catch (error) {
    console.error(`Error getting node at position ${position}:`, error);

    return null;
  }
}

/**
 * Finds the position and instance of a node in the document
 * @param props Object containing editor, node (optional), and nodePos (optional)
 * @param props.editor The Tiptap editor instance
 * @param props.node The node to find (optional if nodePos is provided)
 * @param props.nodePos The position of the node to find (optional if node is provided)
 * @returns An object with the position and node, or null if not found
 */
export function findNodePosition(props: {
  editor: Editor | null;
  node?: PMNode | null;
  nodePos?: number | null;
}): { pos: number; node: PMNode } | null {
  const { editor, node, nodePos } = props;

  if (editor === null) {
    return null;
  }

  // Zero is valid position
  const hasValidNode = node !== undefined && node !== null;
  const hasValidPos = isValidPosition(nodePos);

  if (!hasValidNode && !hasValidPos) {
    return null;
  }

  // First search for the node in the document if we have a node
  if (hasValidNode) {
    let foundPos = -1;
    let foundNode: PMNode | null = null;

    editor.state.doc.descendants((currentNode, pos) => {
      // if (currentNode.type && currentNode.type.name === node!.type.name) {
      if (currentNode === node) {
        foundPos = pos;
        foundNode = currentNode;

        return false;
      }

      return true;
    });

    if (foundPos !== -1 && foundNode !== null) {
      return { node: foundNode, pos: foundPos };
    }
  }

  // If we have a valid position, use findNodeAtPosition
  if (hasValidPos) {
    const nodeAtPos = findNodeAtPosition(editor, nodePos);

    if (nodeAtPos) {
      return { node: nodeAtPos, pos: nodePos };
    }
  }

  return null;
}

/**
 * Determines whether the current selection contains a node whose type matches
 * any of the provided node type names. A name also matches the node types in
 * the schema group of that name, so `"image"` covers every node built from
 * the shared image extension, whatever the node is called.
 * @param editor Tiptap editor instance
 * @param nodeTypeNames List of node type or group names to match against
 * @param checkAncestorNodes Whether to check ancestor node types up the depth chain
 */
export function isNodeTypeSelected(
  editor: Editor | null,
  nodeTypeNames: string[] = [],
  checkAncestorNodes = false
): boolean {
  if (editor === null) {
    return false;
  }

  const { selection } = editor.state;

  if (selection.empty) {
    return false;
  }

  const matches = (node: PMNode) =>
    nodeTypeNames.some(
      (name) => node.type.name === name || node.type.isInGroup(name)
    );

  // Direct node selection check
  if (selection instanceof NodeSelection) {
    const selectedNode = selection.node;

    return matches(selectedNode);
  }

  // Depth-based ancestor node check
  if (checkAncestorNodes) {
    const { $from } = selection;

    for (let { depth } = $from; depth > 0; depth -= 1) {
      if (matches($from.node(depth))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check whether the current selection is fully within nodes
 * whose type names are in the provided `types` list.
 *
 * - NodeSelection → checks the selected node.
 * - Text/AllSelection → ensures all textblocks within [from, to) are allowed.
 */
export function selectionWithinConvertibleTypes(
  editor: Editor,
  types: string[] = []
): boolean {
  if (types.length === 0) {
    return false;
  }

  const { state } = editor;
  const { selection } = state;
  const allowed = new Set(types);

  if (selection instanceof NodeSelection) {
    return allowed.has(selection.node.type.name);
  }

  if (selection instanceof TextSelection || selection instanceof AllSelection) {
    let valid = true;
    state.doc.nodesBetween(selection.from, selection.to, (node) => {
      if (node.isTextblock && !allowed.has(node.type.name)) {
        valid = false;

        return false;
      }

      return valid;
    });

    return valid;
  }

  return false;
}

export function sanitizeUrl(
  inputUrl: string,
  baseUrl: string,
  protocols?: LinkOptions["protocols"]
): string {
  try {
    const url = new URL(inputUrl, baseUrl);

    if (isAllowedUri(url.href, protocols) !== null) {
      return url.href;
    }
  } catch {
    // If URL creation fails, it's considered invalid
  }

  return "#";
}

/**
 * Update a single attribute on multiple nodes.
 *
 * @param tr - The transaction to mutate
 * @param targets - Array of { node, pos }
 * @param attrName - Attribute key to update
 * @param next - New value OR updater function receiving previous value
 *               Pass `undefined` to remove the attribute.
 * @returns true if at least one node was updated, false otherwise
 */
export function updateNodesAttr(
  tr: Transaction,
  targets: readonly NodeWithPos[],
  attrName: string,
  next: string | null
): boolean {
  let changed = false;

  for (const { pos } of targets) {
    const currentNode = tr.doc.nodeAt(pos);

    if (currentNode === null || currentNode.attrs[attrName] === next) {
      continue;
    }

    tr.setNodeAttribute(pos, attrName, next);
    changed = true;
  }

  return changed;
}

/**
 * Retrieves all nodes of specified types from the current selection.
 * @param selection The current editor selection
 * @param allowedNodeTypes An array of node type names to look for (e.g., ["image", "table"])
 * @returns An array of objects containing the node and its position
 */
export function getSelectedNodesOfType(
  selection: Selection,
  allowedNodeTypes: string[]
): NodeWithPos[] {
  const results: NodeWithPos[] = [];
  const allowed = new Set(allowedNodeTypes);

  if (selection instanceof CellSelection) {
    selection.forEachCell((node: PMNode, pos: number) => {
      if (allowed.has(node.type.name)) {
        results.push({ node, pos });
      }
    });

    return results;
  }

  if (selection instanceof NodeSelection) {
    const { node, from: pos } = selection;

    if (allowed.has(node.type.name)) {
      results.push({ node, pos });
    }

    return results;
  }

  const { $anchor } = selection;
  const cell = cellAround($anchor);

  if (cell) {
    const cellNode = selection.$anchor.doc.nodeAt(cell.pos);

    if (cellNode && allowed.has(cellNode.type.name)) {
      results.push({ node: cellNode, pos: cell.pos });

      return results;
    }
  }

  // Fallback: find parent nodes of allowed types
  const parentNode = findParentNodeClosestToPos($anchor, (node) =>
    allowed.has(node.type.name)
  );

  if (parentNode) {
    results.push({ node: parentNode.node, pos: parentNode.pos });
  }

  return results;
}

export function getSelectedBlockNodes(editor: Editor): PMNode[] {
  const { doc } = editor.state;
  const { from, to } = editor.state.selection;

  const blocks: PMNode[] = [];
  const seen = new Set<number>();

  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isBlock) {
      return;
    }

    if (!seen.has(pos)) {
      seen.add(pos);
      blocks.push(node);
    }

    return false;
  });

  return blocks;
}
