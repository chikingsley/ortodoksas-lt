"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
// --- Icons ---
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Lib ---
import { isMarkInSchema, isNodeTypeSelected } from "@/lib/tiptap-utils";

export const COLOR_HIGHLIGHT_SHORTCUT_KEY = "mod+shift+h";
export const HIGHLIGHT_COLORS = [
  {
    border: "var(--tt-bg-color-contrast)",
    colorValue: "#ffffff",
    label: "Default background",
    value: "var(--tt-bg-color)",
  },
  {
    border: "var(--tt-color-highlight-gray-contrast)",
    colorValue: "#f8f8f7",
    label: "Gray background",
    value: "var(--tt-color-highlight-gray)",
  },
  {
    border: "var(--tt-color-highlight-brown-contrast)",
    colorValue: "#f4eeee",
    label: "Brown background",
    value: "var(--tt-color-highlight-brown)",
  },
  {
    border: "var(--tt-color-highlight-orange-contrast)",
    colorValue: "#fbecdd",
    label: "Orange background",
    value: "var(--tt-color-highlight-orange)",
  },
  {
    border: "var(--tt-color-highlight-yellow-contrast)",
    colorValue: "#fef9c3",
    label: "Yellow background",
    value: "var(--tt-color-highlight-yellow)",
  },
  {
    border: "var(--tt-color-highlight-green-contrast)",
    colorValue: "#dcfce7",
    label: "Green background",
    value: "var(--tt-color-highlight-green)",
  },
  {
    border: "var(--tt-color-highlight-blue-contrast)",
    colorValue: "#e0f2fe",
    label: "Blue background",
    value: "var(--tt-color-highlight-blue)",
  },
  {
    border: "var(--tt-color-highlight-purple-contrast)",
    colorValue: "#f3e8ff",
    label: "Purple background",
    value: "var(--tt-color-highlight-purple)",
  },
  {
    border: "var(--tt-color-highlight-pink-contrast)",
    colorValue: "#fcf1f6",
    label: "Pink background",
    value: "var(--tt-color-highlight-pink)",
  },
  {
    border: "var(--tt-color-highlight-red-contrast)",
    colorValue: "#ffe4e6",
    label: "Red background",
    value: "var(--tt-color-highlight-red)",
  },
];
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/**
 * Configuration for the color highlight functionality
 */
export interface UseColorHighlightConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * Whether the button should hide when the mark is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * The color to apply when toggling the highlight.
   */
  highlightColor?: string;
  /**
   * Optional label to display alongside the icon.
   */
  label?: string;
  /**
   * Called when the highlight is applied.
   */
  onApplied?: ({ color, label }: { color: string; label: string }) => void;
  /**
   * When true, uses the actual color value (colorValue) instead of CSS variable (value).
   * @default false
   */
  useColorValue?: boolean;
}

export function pickHighlightColorsByValue(values: string[]) {
  const colorMap = new Map(
    HIGHLIGHT_COLORS.map((color) => [color.value, color])
  );
  return values
    .map((value) => colorMap.get(value))
    .filter((color): color is (typeof HIGHLIGHT_COLORS)[number] => !!color);
}

/**
 * Gets the appropriate color value based on configuration
 */
export function getHighlightColorValue(
  color: string,
  useColorValue = false
): string {
  if (!useColorValue) {
    return color;
  }

  const colorItem = HIGHLIGHT_COLORS.find(
    (c) => c.value === color || c.colorValue === color
  );
  return colorItem?.colorValue || color;
}

/**
 * Checks if highlight can be applied based on the mode and current editor state
 */
export function canColorHighlight(editor: Editor | null): boolean {
  if (!(editor && editor.isEditable)) {
    return false;
  }

  if (
    !isMarkInSchema("highlight", editor) ||
    isNodeTypeSelected(editor, ["image"])
  ) {
    return false;
  }

  return editor.can().setMark("highlight");
}

/**
 * Checks if highlight is currently active
 */
export function isColorHighlightActive(
  editor: Editor | null,
  highlightColor?: string
): boolean {
  if (!(editor && editor.isEditable)) {
    return false;
  }

  return highlightColor
    ? editor.isActive("highlight", { color: highlightColor })
    : editor.isActive("highlight");
}

/**
 * Removes highlight based on the mode
 */
export function removeHighlight(editor: Editor | null): boolean {
  if (!(editor && editor.isEditable)) {
    return false;
  }
  if (!canColorHighlight(editor)) {
    return false;
  }

  return editor.chain().focus().unsetMark("highlight").run();
}

/**
 * Determines if the highlight button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
}): boolean {
  const { editor, hideWhenUnavailable } = props;

  if (!editor) {
    return false;
  }

  if (!hideWhenUnavailable) {
    return true;
  }

  if (!editor.isEditable) {
    return false;
  }

  if (!isMarkInSchema("highlight", editor)) {
    return false;
  }

  if (!editor.isActive("code")) {
    return canColorHighlight(editor);
  }

  return true;
}

export function useColorHighlight(config: UseColorHighlightConfig) {
  const {
    editor: providedEditor,
    label,
    highlightColor,
    hideWhenUnavailable = false,
    useColorValue = false,
    onApplied,
  } = config;

  const { editor } = useTiptapEditor(providedEditor);
  const isMobile = useIsBreakpoint();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const canColorHighlightState = canColorHighlight(editor);
  const actualColor = highlightColor
    ? getHighlightColorValue(highlightColor, useColorValue)
    : highlightColor;
  const isActive = isColorHighlightActive(editor, actualColor);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowButton({ editor, hideWhenUnavailable }));
    };

    handleSelectionUpdate();

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, hideWhenUnavailable]);

  const handleColorHighlight = useCallback(() => {
    if (!(editor && canColorHighlightState && actualColor && label)) {
      return false;
    }

    if (editor.state.storedMarks) {
      const highlightMarkType = editor.schema.marks.highlight;
      if (highlightMarkType) {
        editor.view.dispatch(
          editor.state.tr.removeStoredMark(highlightMarkType)
        );
      }
    }

    setTimeout(() => {
      const success = editor
        .chain()
        .focus()
        .toggleHighlight({ color: actualColor })
        .run();
      if (success) {
        onApplied?.({ color: actualColor, label });
      }
      return success;
    }, 0);

    return true;
  }, [canColorHighlightState, actualColor, editor, label, onApplied]);

  const handleRemoveHighlight = useCallback(() => {
    const success = removeHighlight(editor);
    if (success) {
      onApplied?.({ color: "", label: "Remove highlight" });
    }
    return success;
  }, [editor, onApplied]);

  useHotkeys(
    COLOR_HIGHLIGHT_SHORTCUT_KEY,
    (event) => {
      event.preventDefault();
      handleColorHighlight();
    },
    {
      enabled: isVisible && canColorHighlightState,
      enableOnContentEditable: !isMobile,
      enableOnFormTags: true,
    }
  );

  return {
    canColorHighlight: canColorHighlightState,
    handleColorHighlight,
    handleRemoveHighlight,
    Icon: HighlighterIcon,
    isActive,
    isVisible,
    label: label || "Highlight",
    shortcutKeys: COLOR_HIGHLIGHT_SHORTCUT_KEY,
  };
}
