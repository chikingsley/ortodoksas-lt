"use client";

import type { Editor } from "@tiptap/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";

type Orientation = "horizontal" | "vertical" | "both";

interface MenuNavigationOptions<T> {
  autoSelectFirstItem?: boolean;
  containerRef?: RefObject<HTMLElement | null>;
  editor?: Editor | null;
  items: T[];
  loopOnTab?: boolean;
  onClose?: () => void;
  onSelect?: (item: T) => void;
  orientation?: Orientation;
  query?: string;
}

function navigationStep(
  key: string,
  orientation: Orientation,
  tabLoops: boolean,
  shift: boolean
) {
  if (key === "Tab") {
    if (!tabLoops) {
      return null;
    }

    return shift ? -1 : 1;
  }

  if (orientation !== "horizontal") {
    if (key === "ArrowUp") {
      return -1;
    }

    if (key === "ArrowDown") {
      return 1;
    }
  }

  if (orientation !== "vertical") {
    if (key === "ArrowLeft") {
      return -1;
    }

    if (key === "ArrowRight") {
      return 1;
    }
  }

  return null;
}

export function useMenuNavigation<T>({
  autoSelectFirstItem = true,
  containerRef,
  editor,
  items,
  loopOnTab = true,
  onClose,
  onSelect,
  orientation = "vertical",
  query,
}: MenuNavigationOptions<T>) {
  const initialIndex = autoSelectFirstItem ? 0 : -1;
  const [selection, setSelection] = useState({ index: initialIndex, query });

  const selectedIndex =
    selection.query === query ? selection.index : initialIndex;

  const setSelectedIndex: Dispatch<SetStateAction<number>> = useCallback(
    (next) => {
      setSelection((current) => {
        const currentIndex =
          current.query === query ? current.index : initialIndex;

        return {
          // oxlint-disable-next-line anti-slop/no-runtime-typeof -- React specifies a number or updater callback for SetStateAction.
          index: typeof next === "function" ? next(currentIndex) : next,
          query,
        };
      });
    },
    [initialIndex, query]
  );

  useEffect(() => {
    const target = editor?.view.dom ?? containerRef?.current;

    if (target === null || target === undefined) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      if (items.length === 0) {
        return;
      }

      const step = navigationStep(
        event.key,
        orientation,
        loopOnTab,
        event.shiftKey
      );

      if (step !== null) {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (current < 0) {
            return step > 0 ? 0 : items.length - 1;
          }

          return (current + step + items.length) % items.length;
        });

        return;
      }

      switch (event.key) {
        case "Home":
        case "End": {
          event.preventDefault();
          setSelectedIndex(event.key === "Home" ? 0 : items.length - 1);
          break;
        }

        case "Enter": {
          if (event.isComposing) {
            return;
          }

          event.preventDefault();
          const item = items[selectedIndex];

          if (item !== undefined) {
            onSelect?.(item);
          }

          break;
        }

        case "Escape": {
          if (onClose !== undefined) {
            event.preventDefault();
            onClose();
          }

          break;
        }

        default: {
          break;
        }
      }
    }

    target.addEventListener("keydown", handleKey, true);

    return () => {
      target.removeEventListener("keydown", handleKey, true);
    };
  }, [
    containerRef,
    editor,
    items,
    loopOnTab,
    onClose,
    onSelect,
    orientation,
    selectedIndex,
    setSelectedIndex,
  ]);

  return {
    selectedIndex: items.length > 0 ? selectedIndex : undefined,
    setSelectedIndex,
  };
}
