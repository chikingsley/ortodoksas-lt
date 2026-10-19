"use client";

import type { Editor } from "@tiptap/react";
import type { ForwardedRef } from "react";
import { forwardRef, useCallback, useState } from "react";

// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon";
// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button/button";
import { Button } from "@/components/tiptap-ui-primitive/button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/tiptap-ui-primitive/dropdown-menu/dropdown-menu";
import { ListButton } from "@/components/tiptap-ui/list-button/list-button";
// --- Tiptap UI ---
import type { ListType } from "@/components/tiptap-ui/list-button/use-list";
import { useListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu/use-list-dropdown-menu";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

const DEFAULT_LIST_TYPES: ListType[] = [
  "bulletList",
  "orderedList",
  "taskList",
];

export interface ListDropdownMenuProps extends Omit<ButtonProps, "type"> {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor;
  /**
   * The list types to display in the dropdown.
   */
  types?: ListType[];
  /**
   * Whether the dropdown should be hidden when no list types are available
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback for when the dropdown opens or closes
   */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Whether the dropdown should use a modal
   */
  modal?: boolean;
}

function ListDropdownMenuImpl(
  {
    editor: providedEditor,
    types = DEFAULT_LIST_TYPES,
    hideWhenUnavailable = false,
    onOpenChange,
    modal = true,
    ...props
  }: ListDropdownMenuProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  const { editor } = useTiptapEditor(providedEditor);
  const [isOpen, setIsOpen] = useState(false);

  const { filteredLists, canToggle, isActive, isVisible, Icon } =
    useListDropdownMenu({
      editor,
      hideWhenUnavailable,
      types,
    });

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <DropdownMenu modal={modal} open={isOpen} onOpenChange={handleOnOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          data-active-state={isActive ? "on" : "off"}
          tabIndex={-1}
          disabled={!canToggle}
          data-disabled={!canToggle}
          aria-label="List options"
          tooltip="List"
          {...props}
          ref={ref}
        >
          <Icon className="tiptap-button-icon" />
          <ChevronDownIcon className="tiptap-button-dropdown-small" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          {filteredLists.map((option) => (
            <DropdownMenuItem key={option.type} asChild>
              <ListButton
                editor={editor}
                type={option.type}
                text={option.label}
                showTooltip={false}
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ListDropdownMenu = forwardRef(ListDropdownMenuImpl);

ListDropdownMenu.displayName = "ListDropdownMenu";

export default ListDropdownMenu;
