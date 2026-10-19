"use client";

import { useMergeRefs } from "@floating-ui/react";
import type { Ref, RefObject } from "react";

export function useComposedRef<T extends HTMLElement>(
  libRef: RefObject<T | null>,
  userRef: Ref<T> | undefined
) {
  return useMergeRefs([libRef, userRef]);
}
