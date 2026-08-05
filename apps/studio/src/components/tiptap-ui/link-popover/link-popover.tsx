"use client";

import type { Editor } from "@tiptap/react";
import { forwardRef, useCallback, useEffect, useState } from "react";
// --- Icons ---
import { CornerDownLeftIcon } from "@/components/tiptap-icons/corner-down-left-icon";
import { ExternalLinkIcon } from "@/components/tiptap-icons/external-link-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
import { TrashIcon } from "@/components/tiptap-icons/trash-icon";
// --- Tiptap UI ---
import type { UseLinkPopoverConfig } from "@/components/tiptap-ui/link-popover";
import { useLinkPopover } from "@/components/tiptap-ui/link-popover";
// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button-group";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "@/components/tiptap-ui-primitive/card";
import { Input } from "@/components/tiptap-ui-primitive/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import "./link-popover.scss";

export interface LinkMainProps {
  /**
   * Whether the link is currently active in the editor.
   */
  isActive: boolean;
  /**
   * Function to open the link.
   */
  openLink: () => void;
  /**
   * Function to remove the link from the editor.
   */
  removeLink: () => void;
  /**
   * Function to set the link in the editor.
   */
  setLink: () => void;
  /**
   * Function to update the URL state.
   */
  setUrl: React.Dispatch<React.SetStateAction<string | null>>;
  /**
   * The URL to set for the link.
   */
  url: string;
}

export interface LinkPopoverProps
  extends Omit<ButtonProps, "type">,
    UseLinkPopoverConfig {
  /**
   * Whether to automatically open the popover when a link is active.
   * @default true
   */
  autoOpenOnLinkActive?: boolean;
  /**
   * Callback for when the popover opens or closes.
   */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Link button component for triggering the link popover
 */
export const LinkButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => (
    <Button
      aria-label="Link"
      className={className}
      ref={ref}
      role="button"
      tabIndex={-1}
      tooltip="Link"
      type="button"
      variant="ghost"
      {...props}
    >
      {children || <LinkIcon className="tiptap-button-icon" />}
    </Button>
  )
);

LinkButton.displayName = "LinkButton";

/**
 * Main content component for the link popover
 */
const LinkMain: React.FC<LinkMainProps> = ({
  url,
  setUrl,
  setLink,
  removeLink,
  openLink,
  isActive,
}) => {
  const isMobile = useIsBreakpoint();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setLink();
    }
  };

  return (
    <Card
      style={{
        ...(isMobile ? { border: 0, boxShadow: "none" } : {}),
      }}
    >
      <CardBody
        style={{
          ...(isMobile ? { padding: 0 } : {}),
        }}
      >
        <CardItemGroup orientation="horizontal">
          <Input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            autoFocus
            className="tiptap-link-input"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a link..."
            type="url"
            value={url}
          />

          <ButtonGroup>
            <Button
              disabled={!(url || isActive)}
              onClick={setLink}
              title="Apply link"
              type="button"
              variant="ghost"
            >
              <CornerDownLeftIcon className="tiptap-button-icon" />
            </Button>
          </ButtonGroup>

          <Separator />

          <ButtonGroup>
            <ButtonGroup>
              <Button
                disabled={!(url || isActive)}
                onClick={openLink}
                title="Open in new window"
                type="button"
                variant="ghost"
              >
                <ExternalLinkIcon className="tiptap-button-icon" />
              </Button>
            </ButtonGroup>

            <ButtonGroup>
              <Button
                disabled={!(url || isActive)}
                onClick={removeLink}
                title="Remove link"
                type="button"
                variant="ghost"
              >
                <TrashIcon className="tiptap-button-icon" />
              </Button>
            </ButtonGroup>
          </ButtonGroup>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
};

/**
 * Link content component for standalone use
 */
export const LinkContent: React.FC<{
  editor?: Editor | null;
}> = ({ editor }) => {
  const linkPopover = useLinkPopover({
    editor,
  });

  return <LinkMain {...linkPopover} />;
};

/**
 * Link popover component for Tiptap editors.
 *
 * For custom popover implementations, use the `useLinkPopover` hook instead.
 */
export const LinkPopover = forwardRef<HTMLButtonElement, LinkPopoverProps>(
  (
    {
      editor: providedEditor,
      hideWhenUnavailable = false,
      onSetLink,
      onOpenChange,
      autoOpenOnLinkActive = true,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor);
    const [isOpen, setIsOpen] = useState(false);

    const {
      isVisible,
      canSet,
      isActive,
      url,
      setUrl,
      setLink,
      removeLink,
      openLink,
      label,
      Icon,
    } = useLinkPopover({
      editor,
      hideWhenUnavailable,
      onSetLink,
    });

    const shouldAutoOpen =
      autoOpenOnLinkActive && !!editor?.isFocused && isActive;

    const handleOnOpenChange = useCallback(
      (nextIsOpen: boolean) => {
        setIsOpen(nextIsOpen);
        onOpenChange?.(nextIsOpen);
      },
      [onOpenChange]
    );

    const handleSetLink = useCallback(() => {
      setLink();
      setIsOpen(false);
    }, [setLink]);

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        setIsOpen(!isOpen);
      },
      [onClick, isOpen]
    );

    useEffect(() => {
      if (shouldAutoOpen) {
        setIsOpen(true);
      }
    }, [shouldAutoOpen]);

    if (!isVisible) {
      return null;
    }

    return (
      <Popover onOpenChange={handleOnOpenChange} open={isOpen}>
        <PopoverTrigger asChild>
          <LinkButton
            aria-label={label}
            aria-pressed={isActive}
            data-active-state={isActive ? "on" : "off"}
            data-disabled={!canSet}
            disabled={!canSet}
            onClick={handleClick}
            {...buttonProps}
            ref={ref}
          >
            {children ?? <Icon className="tiptap-button-icon" />}
          </LinkButton>
        </PopoverTrigger>

        <PopoverContent collisionPadding={4}>
          <LinkMain
            isActive={isActive}
            openLink={openLink}
            removeLink={removeLink}
            setLink={handleSetLink}
            setUrl={setUrl}
            url={url}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

LinkPopover.displayName = "LinkPopover";

export default LinkPopover;
