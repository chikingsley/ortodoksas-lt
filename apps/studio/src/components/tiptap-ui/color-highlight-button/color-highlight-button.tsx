import { forwardRef, useCallback, useMemo } from "react";
// --- Tiptap UI ---
import type { UseColorHighlightConfig } from "@/components/tiptap-ui/color-highlight-button";
import {
  COLOR_HIGHLIGHT_SHORTCUT_KEY,
  useColorHighlight,
} from "@/components/tiptap-ui/color-highlight-button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import { Button } from "@/components/tiptap-ui-primitive/button";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-ui/color-highlight-button/color-highlight-button.scss";

export interface ColorHighlightButtonProps
  extends Omit<ButtonProps, "type">,
    UseColorHighlightConfig {
  /**
   * Optional show shortcut keys in the button.
   * @default false
   */
  showShortcut?: boolean;
  /**
   * Optional text to display alongside the icon.
   */
  text?: string;
}

export function ColorHighlightShortcutBadge({
  shortcutKeys = COLOR_HIGHLIGHT_SHORTCUT_KEY,
}: {
  shortcutKeys?: string;
}) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>;
}

/**
 * Button component for applying color highlights in a Tiptap editor.
 *
 * Supports two highlighting modes:
 * - "mark": Uses the highlight mark extension (default)
 * - "node": Uses the node background extension
 *
 * For custom button implementations, use the `useColorHighlight` hook instead.
 *
 * @example
 * ```tsx
 * // Mark-based highlighting (default)
 * <ColorHighlightButton highlightColor="yellow" />
 *
 * // Node-based background coloring
 * <ColorHighlightButton
 *   highlightColor="var(--tt-color-highlight-blue)"
 *   mode="node"
 * />
 *
 * // With custom callback
 * <ColorHighlightButton
 *   highlightColor="red"
 *   mode="mark"
 *   onApplied={({ color, mode }) => console.log(`Applied ${color} in ${mode} mode`)}
 * />
 * ```
 */
export const ColorHighlightButton = forwardRef<
  HTMLButtonElement,
  ColorHighlightButtonProps
>(
  (
    {
      editor: providedEditor,
      highlightColor,
      text,
      hideWhenUnavailable = false,
      mode = "mark",
      onApplied,
      showShortcut = false,
      onClick,
      children,
      style,
      useColorValue = false,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor);
    const {
      isVisible,
      canColorHighlight,
      isActive,
      handleColorHighlight,
      label,
      shortcutKeys,
    } = useColorHighlight({
      editor,
      hideWhenUnavailable,
      highlightColor,
      label: text || `Toggle highlight (${highlightColor})`,
      mode,
      onApplied,
      useColorValue,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        handleColorHighlight();
      },
      [handleColorHighlight, onClick]
    );

    const buttonStyle = useMemo(
      () =>
        ({
          ...style,
          "--highlight-color": highlightColor,
        }) as React.CSSProperties,
      [highlightColor, style]
    );

    if (!isVisible) {
      return null;
    }

    return (
      <Button
        aria-label={label}
        aria-pressed={isActive}
        data-active-state={isActive ? "on" : "off"}
        data-disabled={!canColorHighlight}
        disabled={!canColorHighlight}
        onClick={handleClick}
        role="button"
        style={buttonStyle}
        tabIndex={-1}
        tooltip={label}
        type="button"
        variant="ghost"
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <span
              className="tiptap-button-highlight"
              style={
                { "--highlight-color": highlightColor } as React.CSSProperties
              }
            />
            {text && <span className="tiptap-button-text">{text}</span>}
            {showShortcut && (
              <ColorHighlightShortcutBadge shortcutKeys={shortcutKeys} />
            )}
          </>
        )}
      </Button>
    );
  }
);

ColorHighlightButton.displayName = "ColorHighlightButton";
