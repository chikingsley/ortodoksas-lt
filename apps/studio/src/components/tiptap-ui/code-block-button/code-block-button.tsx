import { forwardRef, useCallback } from "react";
// --- Tiptap UI ---
import type { UseCodeBlockConfig } from "@/components/tiptap-ui/code-block-button";
import {
  CODE_BLOCK_SHORTCUT_KEY,
  useCodeBlock,
} from "@/components/tiptap-ui/code-block-button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import { Button } from "@/components/tiptap-ui-primitive/button";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";

export interface CodeBlockButtonProps
  extends Omit<ButtonProps, "type">,
    UseCodeBlockConfig {
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

export function CodeBlockShortcutBadge({
  shortcutKeys = CODE_BLOCK_SHORTCUT_KEY,
}: {
  shortcutKeys?: string;
}) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>;
}

/**
 * Button component for toggling code block in a Tiptap editor.
 *
 * For custom button implementations, use the `useCodeBlock` hook instead.
 */
export const CodeBlockButton = forwardRef<
  HTMLButtonElement,
  CodeBlockButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      hideWhenUnavailable = false,
      onToggled,
      showShortcut = false,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor);
    const {
      isVisible,
      canToggle,
      isActive,
      handleToggle,
      label,
      shortcutKeys,
      Icon,
    } = useCodeBlock({
      editor,
      hideWhenUnavailable,
      onToggled,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        handleToggle();
      },
      [handleToggle, onClick]
    );

    if (!isVisible) {
      return null;
    }

    return (
      <Button
        aria-label={label}
        aria-pressed={isActive}
        data-active-state={isActive ? "on" : "off"}
        data-disabled={!canToggle}
        disabled={!canToggle}
        onClick={handleClick}
        role="button"
        tabIndex={-1}
        tooltip="Code Block"
        type="button"
        variant="ghost"
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <Icon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
            {showShortcut && (
              <CodeBlockShortcutBadge shortcutKeys={shortcutKeys} />
            )}
          </>
        )}
      </Button>
    );
  }
);

CodeBlockButton.displayName = "CodeBlockButton";
