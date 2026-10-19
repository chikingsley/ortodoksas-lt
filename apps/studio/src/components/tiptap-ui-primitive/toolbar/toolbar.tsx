"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- WAI-ARIA group expresses related toolbar or input controls; fieldset would introduce form grouping and legend semantics. This preserves the upstream component contract. */

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { Separator } from "@/components/tiptap-ui-primitive/separator/separator";

import "@/components/tiptap-ui-primitive/toolbar/toolbar.scss";
import { useComposedRef } from "@/hooks/use-composed-ref";
import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { cn } from "@/lib/tiptap-utils";

type BaseProps = React.HTMLAttributes<HTMLDivElement>;

interface ToolbarProps extends BaseProps {
  variant?: "floating" | "fixed";
}

function setContainerTabStop(
  items: HTMLElement[],
  currentItem: HTMLElement | undefined,
  toolbar: HTMLElement,
  initialContainerTabIndex: number
) {
  for (const item of items) {
    item.setAttribute("tabindex", "-1");
  }

  if (currentItem === undefined) {
    toolbar.tabIndex = initialContainerTabIndex;
  } else {
    toolbar.tabIndex = -1;

    if (toolbar.contains(toolbar.ownerDocument.activeElement)) {
      currentItem.focus();
    }
  }
}

const useToolbarNavigation = (
  toolbarRef: React.RefObject<HTMLDivElement | null>
) => {
  const [items, setItems] = useState<HTMLElement[]>([]);

  const initialContainerTabIndexRef = useRef<{
    tabIndex: number | null;
  } | null>(null);

  const collectItems = useCallback(() => {
    if (!toolbarRef.current) {
      return [];
    }

    return [
      ...toolbarRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [role="button"]:not([disabled]), [tabindex="0"]:not([disabled])'
      ),
    ];
  }, [toolbarRef]);

  useEffect(() => {
    const toolbar = toolbarRef.current;

    if (!toolbar) {
      return;
    }

    initialContainerTabIndexRef.current ??= {
      tabIndex:
        toolbar.hasAttribute("tabindex") && toolbar.tabIndex >= 0
          ? toolbar.tabIndex
          : null,
    };

    const updateItems = () => {
      setItems(collectItems());
    };

    updateItems();
    const observer = new MutationObserver(updateItems);
    observer.observe(toolbar, {
      attributeFilter: ["disabled"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [collectItems, toolbarRef]);

  const { selectedIndex, setSelectedIndex } = useMenuNavigation<HTMLElement>({
    autoSelectFirstItem: false,
    containerRef: toolbarRef,
    items,
    loopOnTab: false,
    onSelect: (el) => {
      el.click();
    },
    orientation: "horizontal",
  });

  useEffect(() => {
    const toolbar = toolbarRef.current;

    if (!toolbar) {
      return;
    }

    const handleFocus = (e: FocusEvent) => {
      const { target } = e;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (toolbar.contains(target)) {
        target.dataset.focusVisible = "true";
        const itemIndex = items.indexOf(target);

        if (itemIndex !== -1) {
          setSelectedIndex(itemIndex);
        }
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const { target } = e;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (toolbar.contains(target)) {
        delete target.dataset.focusVisible;
      }

      const nextTarget = e.relatedTarget;
      const NodeConstructor = toolbar.ownerDocument.defaultView?.Node;

      const leavesToolbar =
        !nextTarget ||
        !NodeConstructor ||
        !(nextTarget instanceof NodeConstructor) ||
        !toolbar.contains(nextTarget);

      const initialTabIndex = initialContainerTabIndexRef.current?.tabIndex;

      if (
        leavesToolbar &&
        initialTabIndex !== undefined &&
        initialTabIndex !== null
      ) {
        queueMicrotask(() => {
          if (
            toolbar.isConnected &&
            !toolbar.contains(toolbar.ownerDocument.activeElement)
          ) {
            toolbar.tabIndex = initialTabIndex;
            setSelectedIndex(-1);
          }
        });
      }
    };

    toolbar.addEventListener("focus", handleFocus, true);
    toolbar.addEventListener("blur", handleBlur, true);

    return () => {
      toolbar.removeEventListener("focus", handleFocus, true);
      toolbar.removeEventListener("blur", handleBlur, true);
    };
  }, [items, setSelectedIndex, toolbarRef]);

  useEffect(() => {
    if (!items.length) {
      return;
    }

    const toolbar = toolbarRef.current;

    if (!toolbar) {
      return;
    }

    const initialContainerTabIndex =
      initialContainerTabIndexRef.current?.tabIndex;

    const currentIndex = selectedIndex ?? -1;
    const currentItem = items[currentIndex];

    if (
      initialContainerTabIndex !== null &&
      initialContainerTabIndex !== undefined
    ) {
      setContainerTabStop(
        items,
        currentItem,
        toolbar,
        initialContainerTabIndex
      );

      return;
    }

    const existingTabStop = items.findIndex((item) => item.tabIndex === 0);

    const fallbackIndex = existingTabStop === -1 ? 0 : existingTabStop;

    const activeIndex =
      currentIndex >= 0 && items[currentIndex] ? currentIndex : fallbackIndex;

    for (const [index, item] of items.entries()) {
      item.setAttribute("tabindex", index === activeIndex ? "0" : "-1");
    }

    // Only restore focus while it is inside the toolbar. The item list also
    // refreshes when focus legitimately lives elsewhere (e.g. a popover
    // opened from the toolbar autofocused its input), and stealing focus
    // back would dismiss such overlays.
    if (
      currentItem !== undefined &&
      toolbar.contains(toolbar.ownerDocument.activeElement)
    ) {
      items[activeIndex]?.focus();
    }
  }, [selectedIndex, items, toolbarRef]);
};

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ children, className, variant = "fixed", ...props }, ref) => {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRef(toolbarRef, ref);
    useToolbarNavigation(toolbarRef);

    return (
      <div
        ref={composedRef}
        role="toolbar"
        aria-label="toolbar"
        data-variant={variant}
        className={cn("tiptap-toolbar", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Toolbar.displayName = "Toolbar";

export const ToolbarGroup = forwardRef<HTMLDivElement, BaseProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      className={cn("tiptap-toolbar-group", className)}
      {...props}
    >
      {children}
    </div>
  )
);

ToolbarGroup.displayName = "ToolbarGroup";

export const ToolbarSeparator = forwardRef<HTMLDivElement, BaseProps>(
  ({ ...props }, ref) => (
    <Separator ref={ref} orientation="vertical" decorative {...props} />
  )
);

ToolbarSeparator.displayName = "ToolbarSeparator";
