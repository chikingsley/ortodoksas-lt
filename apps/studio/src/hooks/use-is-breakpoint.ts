"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

type BreakpointMode = "min" | "max";

export function useIsBreakpoint(
  mode: BreakpointMode = "max",
  breakpoint = 768
) {
  return useMediaQuery(
    mode === "min"
      ? `(min-width: ${breakpoint}px)`
      : `(max-width: ${breakpoint - 1}px)`
  );
}
