import { forwardRef, useCallback, useState } from "react";

// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon";
// --- Tiptap UI ---
import { HeadingButton } from "@/components/tiptap-ui/heading-button";
import type { UseHeadingDropdownMenuConfig } from "@/components/tiptap-ui/heading-dropdown-menu";
import { useHeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/tiptap-ui-primitive/dropdown-menu";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

export interface HeadingDropdownMenuProps
  extends Omit<ButtonProps, "type">,
    UseHeadingDropdownMenuConfig {
  /**
   * Whether the dropdown should use a modal
   */
  modal?: boolean;
  /**
   * Callback for when the dropdown opens or closes
   */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Dropdown menu component for selecting heading levels in a Tiptap editor.
 *
 * For custom dropdown implementations, use the `useHeadingDropdownMenu` hook instead.
 */
export const HeadingDropdownMenu = forwardRef<
  HTMLButtonElement,
  HeadingDropdownMenuProps
>(
  (
    {
      editor: providedEditor,
      levels = [1, 2, 3, 4, 5, 6],
      hideWhenUnavailable = false,
      onOpenChange,
      children,
      modal = true,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { isVisible, isActive, canToggle, Icon } = useHeadingDropdownMenu({
      editor,
      hideWhenUnavailable,
      levels,
    });

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!(editor && canToggle)) {
          return;
        }
        setIsOpen(open);
        onOpenChange?.(open);
      },
      [canToggle, editor, onOpenChange]
    );

    if (!isVisible) {
      return null;
    }

    return (
      <DropdownMenu modal={modal} onOpenChange={handleOpenChange} open={isOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Format text as heading"
            aria-pressed={isActive}
            data-active-state={isActive ? "on" : "off"}
            data-disabled={!canToggle}
            disabled={!canToggle}
            role="button"
            tabIndex={-1}
            tooltip="Heading"
            type="button"
            variant="ghost"
            {...buttonProps}
            ref={ref}
          >
            {children ? (
              children
            ) : (
              <>
                <Icon className="tiptap-button-icon" />
                <ChevronDownIcon className="tiptap-button-dropdown-small" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {levels.map((level) => (
              <DropdownMenuItem asChild key={`heading-${level}`}>
                <HeadingButton
                  editor={editor}
                  level={level}
                  showTooltip={false}
                  text={`Heading ${level}`}
                />
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

HeadingDropdownMenu.displayName = "HeadingDropdownMenu";

export default HeadingDropdownMenu;
