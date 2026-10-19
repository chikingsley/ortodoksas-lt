"use client";

import { useMemo, useSyncExternalStore } from "react";

export type RectState = Omit<DOMRect, "toJSON">;

export interface ElementRectOptions {
  element?: Element | null;
  enabled?: boolean;
  throttleMs?: number;
  useResizeObserver?: boolean;
}

const initialRect: RectState = {
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
};

function serverSnapshot() {
  return initialRect;
}

function createRectStore({
  element,
  enabled,
  throttleMs,
  useResizeObserver,
}: Required<ElementRectOptions>) {
  let rect = initialRect;

  return {
    getSnapshot: () => rect,
    subscribe: (notify: () => void) => {
      if (!enabled) {
        return () => {
          /* Disabled tracking creates no subscriptions to dispose. */
        };
      }

      const target = element ?? document.body;
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const measure = () => {
        timeout = undefined;
        const next = target.getBoundingClientRect();

        if (
          next.x === rect.x &&
          next.y === rect.y &&
          next.width === rect.width &&
          next.height === rect.height
        ) {
          return;
        }

        rect = next;
        notify();
      };

      const schedule = () => {
        timeout ??= setTimeout(measure, throttleMs);
      };

      const observer = useResizeObserver ? new ResizeObserver(schedule) : null;
      observer?.observe(target);
      window.addEventListener("scroll", schedule, true);
      window.addEventListener("resize", schedule);
      measure();

      return () => {
        clearTimeout(timeout);
        observer?.disconnect();
        window.removeEventListener("scroll", schedule, true);
        window.removeEventListener("resize", schedule);
      };
    },
  };
}

export function useElementRect({
  element = null,
  enabled = true,
  throttleMs = 100,
  useResizeObserver = true,
}: ElementRectOptions = {}): RectState {
  const store = useMemo(
    () => createRectStore({ element, enabled, throttleMs, useResizeObserver }),
    [element, enabled, throttleMs, useResizeObserver]
  );

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    serverSnapshot
  );
}

export function useBodyRect(
  options: Omit<ElementRectOptions, "element"> = {}
): RectState {
  return useElementRect(options);
}
