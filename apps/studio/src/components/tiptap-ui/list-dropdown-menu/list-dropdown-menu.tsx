import type { Editor } from "@tiptap/react";
import { type ForwardedRef, forwardRef, useCallback, useState } from "react";
// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon";
// --- Tiptap UI ---
import { ListButton, type ListType } from "@/components/tiptap-ui/list-button";
import { useListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu/use-list-dropdown-menu";
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

export interface ListDropdownMenuProps extends Omit<ButtonProps, "type"> {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor;
  /**
   * Whether the dropdown should be hidden when no list types are available
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Whether the dropdown should use a modal
   */
  modal?: boolean;
  /**
   * Callback for when the dropdown opens or closes
   */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * The list types to display in the dropdown.
   */
  types?: ListType[];
}

function ListDropdownMenuImpl(
  {
    editor: providedEditor,
    types = ["bulletList", "orderedList", "taskList"],
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
    <DropdownMenu modal={modal} onOpenChange={handleOnOpenChange} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="List options"
          data-active-state={isActive ? "on" : "off"}
          data-disabled={!canToggle}
          disabled={!canToggle}
          role="button"
          tabIndex={-1}
          tooltip="List"
          type="button"
          variant="ghost"
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
            <DropdownMenuItem asChild key={option.type}>
              <ListButton
                editor={editor}
                showTooltip={false}
                text={option.label}
                type={option.type}
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
