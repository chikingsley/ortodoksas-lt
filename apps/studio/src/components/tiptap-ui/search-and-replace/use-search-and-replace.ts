"use client";

import type { FindAndReplaceStorage } from "@tiptap/extension-find-and-replace";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";

// --- Icons ---
import { SearchIcon } from "@/components/tiptap-icons/search-icon";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Lib ---
import { isExtensionAvailable } from "@/lib/tiptap-utils";

export const SEARCH_AND_REPLACE_SHORTCUT_KEY = "mod+f";
export const NEXT_RESULT_SHORTCUT_KEY = "mod+shift+f";
export const PREVIOUS_RESULT_SHORTCUT_KEY = "mod+shift+d";

/**
 * CSS classes rendered by the Find and Replace extension for result
 * decorations inside the editor.
 */
export const SEARCH_RESULT_CLASS = "find-and-replace-result";
export const SEARCH_RESULT_CURRENT_CLASS = "find-and-replace-result-current";

export const DEFAULT_SCROLL_INTO_VIEW_OPTIONS: ScrollIntoViewOptions = {
  block: "nearest",
  inline: "nearest",
};

/**
 * Configuration for the search and replace functionality
 */
export interface UseSearchAndReplaceConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * Whether the trigger should hide when the Find and Replace extension
   * is not registered on the editor.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * How the current result is scrolled into view. `behavior` is forced to
   * `auto` when the user prefers reduced motion.
   * @default DEFAULT_SCROLL_INTO_VIEW_OPTIONS
   */
  scrollIntoViewOptions?: ScrollIntoViewOptions;
}

/**
 * Reactive snapshot of the Find and Replace extension storage.
 */
export interface SearchAndReplaceEditorState {
  /**
   * Number of results for the applied search term.
   */
  total: number;
  /**
   * Zero-based index of the current result, or `null` when none is selected.
   */
  currentIndex: number | null;
  /**
   * The search term the extension has applied (post-debounce).
   */
  appliedSearchTerm: string;
  /**
   * Whether the search is case sensitive.
   */
  caseSensitive: boolean;
  /**
   * Whether only whole words are matched.
   */
  wholeWord: boolean;
  /**
   * Whether the search term is treated as a regular expression.
   */
  useRegex: boolean;
}

const EMPTY_EDITOR_STATE: SearchAndReplaceEditorState = {
  appliedSearchTerm: "",
  caseSensitive: false,
  currentIndex: null,
  total: 0,
  useRegex: false,
  wholeWord: false,
};

/**
 * Checks if the Find and Replace extension is registered on the editor
 */
export function isFindAndReplaceAvailable(editor: Editor | null): boolean {
  return isExtensionAvailable(editor, "findAndReplace");
}

/**
 * Returns the Find and Replace extension storage, or `null` when unavailable
 */
export function getFindAndReplaceStorage(
  editor: Editor | null
): FindAndReplaceStorage | null {
  if (!isFindAndReplaceAvailable(editor)) {
    return null;
  }

  return editor?.storage.findAndReplace ?? null;
}

/**
 * Determines if the search and replace trigger should be shown
 */
export function shouldShowSearchAndReplace(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
}): boolean {
  const { editor, hideWhenUnavailable } = props;

  if (!editor) {
    return false;
  }

  if (hideWhenUnavailable) {
    return isFindAndReplaceAvailable(editor);
  }

  return true;
}

/**
 * Formats the result counter as `current / total` for display.
 * The extension index is zero-based and can be `null`, so the counter
 * renders `0 / 0` without results and one-based positions otherwise.
 */
export function formatResultCount(
  currentIndex: number | null,
  total: number
): string {
  if (total === 0) {
    return "0 / 0";
  }

  if (currentIndex === null) {
    return `0 / ${total}`;
  }

  return `${currentIndex + 1} / ${total}`;
}

interface NavigateSearchResultOptions {
  editor: Editor;
  direction: "next" | "previous";
}

function navigateSearchResult({
  editor,
  direction,
}: NavigateSearchResultOptions): boolean {
  const { selection } = editor.state;
  const chain = editor.chain();

  const navigation =
    direction === "next" ? chain.goToNextResult() : chain.goToPreviousResult();

  // Search navigation should update its highlight without changing the
  // editor selection that drives toolbar state.
  return navigation
    .command(({ tr }) => {
      // oxlint-disable-next-line unicorn/no-array-method-this-argument -- ProseMirror Selection.map accepts the document and transaction mapping.
      tr.setSelection(selection.map(tr.doc, tr.mapping));

      return true;
    })
    .run();
}

/**
 * Scrolls the current result into view without stealing focus. The element
 * is resolved from the result's document position rather than the highlight
 * decoration, so it works regardless of how decorations are rendered.
 * Skipped while the editor itself has focus so typing inside the document
 * never causes scroll jumps, and honors `prefers-reduced-motion`.
 */
export function scrollCurrentResultIntoView(
  editor: Editor | null,
  scrollIntoViewOptions: ScrollIntoViewOptions = DEFAULT_SCROLL_INTO_VIEW_OPTIONS
): void {
  if (!editor || editor.isDestroyed) {
    return;
  }

  const storage = getFindAndReplaceStorage(editor);
  const currentIndex = storage?.currentIndex;

  if (!storage || currentIndex === null || currentIndex === undefined) {
    return;
  }

  const result = storage.results[currentIndex];

  if (!result) {
    return;
  }

  const editorDom = editor.view.dom;

  if (editorDom.contains(document.activeElement)) {
    return;
  }

  let target: HTMLElement | null = null;

  try {
    const { node } = editor.view.domAtPos(result.from);
    target = node instanceof HTMLElement ? node : node.parentElement;
  } catch {
    return;
  }

  if (target === null) {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  target.scrollIntoView({
    ...scrollIntoViewOptions,
    behavior: prefersReducedMotion
      ? "auto"
      : (scrollIntoViewOptions.behavior ?? "smooth"),
  });
}

/**
 * Main hook that provides search and replace functionality for a Tiptap editor.
 *
 * The `searchTerm`/`replaceTerm` values mirror the inputs immediately, while
 * search execution is forwarded to the extension's `setSearchTerm`, which
 * applies its own debounce (`searchDebounceMs`) — no additional UI debounce is
 * added. An empty search cancels pending work and clears highlights
 * immediately.
 *
 * @example
 * ```tsx
 * function MySearchPanel() {
 *   const {
 *     isVisible,
 *     resultCountLabel,
 *     searchTerm,
 *     setSearchTerm,
 *     goToNext,
 *   } = useSearchAndReplace()
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <div>
 *       <input
 *         value={searchTerm}
 *         onChange={(event) => setSearchTerm(event.target.value)}
 *       />
 *       <span>{resultCountLabel}</span>
 *       <button onClick={goToNext}>Next</button>
 *     </div>
 *   )
 * }
 * ```
 */
function storedSearchTerms(editor: Editor | null) {
  const storage = getFindAndReplaceStorage(editor);

  return {
    replaceTerm: storage?.replaceTerm ?? "",
    searchTerm: storage?.searchTerm ?? "",
  };
}

export function useSearchAndReplace({
  editor: providedEditor,
  hideWhenUnavailable = false,
  scrollIntoViewOptions = DEFAULT_SCROLL_INTO_VIEW_OPTIONS,
}: UseSearchAndReplaceConfig = {}) {
  const { editor } = useTiptapEditor(providedEditor);
  const canSearch = isFindAndReplaceAvailable(editor);
  const isVisible = shouldShowSearchAndReplace({ editor, hideWhenUnavailable });
  const [searchDraft, setSearchDraft] = useState<string | null>(null);
  const [replaceDraft, setReplaceDraft] = useState<string | null>(null);
  const storedTerms = storedSearchTerms(editor);
  const searchTerm = searchDraft ?? storedTerms.searchTerm;
  const replaceTerm = replaceDraft ?? storedTerms.replaceTerm;

  const editorState =
    useEditorState({
      editor,
      selector: ({ editor: current }) => {
        const currentStorage = getFindAndReplaceStorage(current);

        return currentStorage
          ? {
              appliedSearchTerm: currentStorage.searchTerm,
              caseSensitive: currentStorage.caseSensitive,
              currentIndex: currentStorage.currentIndex,
              total: currentStorage.results.length,
              useRegex: currentStorage.useRegex,
              wholeWord: currentStorage.wholeWord,
            }
          : EMPTY_EDITOR_STATE;
      },
    }) ?? EMPTY_EDITOR_STATE;

  const {
    total,
    currentIndex,
    appliedSearchTerm,
    caseSensitive,
    wholeWord,
    useRegex: regexEnabled,
  } = editorState;

  const setSearchTerm = useCallback(
    (value: string) => {
      setSearchDraft(value);

      if (!editor || !isFindAndReplaceAvailable(editor)) {
        return;
      }

      if (value.length === 0) {
        // Cancels the pending debounced search and clears highlights and
        // the result count immediately.
        editor.commands.clearSearch();
      } else {
        editor.commands.setSearchTerm(value);
      }
    },
    [editor]
  );

  const setReplaceTerm = useCallback(
    (value: string) => {
      setReplaceDraft(value);

      if (!editor || !isFindAndReplaceAvailable(editor)) {
        return;
      }

      editor.commands.setReplaceTerm(value);
    },
    [editor]
  );

  const toggleCaseSensitive = useCallback(() => {
    if (!editor || !isFindAndReplaceAvailable(editor)) {
      return;
    }

    editor.commands.setCaseSensitive(
      getFindAndReplaceStorage(editor)?.caseSensitive !== true
    );
  }, [editor]);

  const toggleWholeWord = useCallback(() => {
    if (!editor || !isFindAndReplaceAvailable(editor)) {
      return;
    }

    editor.commands.setWholeWord(
      getFindAndReplaceStorage(editor)?.wholeWord !== true
    );
  }, [editor]);

  const toggleUseRegex = useCallback(() => {
    if (!editor || !isFindAndReplaceAvailable(editor)) {
      return;
    }

    editor.commands.setUseRegex(
      getFindAndReplaceStorage(editor)?.useRegex !== true
    );
  }, [editor]);

  const goToNext = useCallback(() => {
    if (!editor) {
      return false;
    }

    return navigateSearchResult({ direction: "next", editor });
  }, [editor]);

  const goToPrevious = useCallback(() => {
    if (!editor) {
      return false;
    }

    return navigateSearchResult({ direction: "previous", editor });
  }, [editor]);

  const replaceCurrent = useCallback(() => {
    if (!editor || !editor.isEditable) {
      return false;
    }

    return editor.commands.replace();
  }, [editor]);

  const replaceAll = useCallback(() => {
    if (!editor || !editor.isEditable) {
      return false;
    }

    return editor.commands.replaceAll();
  }, [editor]);

  /**
   * Re-applies the stored terms to the editor. Used when the search UI
   * reopens while the hook instance stayed mounted (e.g. popover reopen).
   */
  const applySearch = useCallback(() => {
    if (!editor || !isFindAndReplaceAvailable(editor)) {
      return;
    }

    editor.commands.setReplaceTerm(replaceTerm);

    if (searchTerm) {
      editor.commands.setSearchTerm(searchTerm);
    }
  }, [editor, searchTerm, replaceTerm]);

  /**
   * Clears highlights and cancels pending work while keeping the entered
   * terms, so closing the search UI does not erase non-empty field values.
   */
  const suspendSearch = useCallback(() => {
    if (!editor || !isFindAndReplaceAvailable(editor) || editor.isDestroyed) {
      return;
    }

    editor.commands.clearSearch();
  }, [editor]);

  /**
   * Clears the search entirely: highlights, pending work and field values.
   */
  const clearSearch = useCallback(() => {
    setSearchDraft("");
    setReplaceDraft("");

    if (!editor || !isFindAndReplaceAvailable(editor) || editor.isDestroyed) {
      return;
    }

    editor.commands.clearSearch();
  }, [editor]);

  // Clear highlights and cancel the pending debounced search when the search
  // UI unmounts, so no stale decorations remain without a way to clear them.
  // Unconditional on purpose: a debounced search may still be pending without
  // being reflected in the extension storage yet.
  useEffect(() => {
    if (!editor || !canSearch) {
      return;
    }

    return () => {
      if (editor.isDestroyed) {
        return;
      }

      editor.commands.clearSearch();
    };
  }, [editor, canSearch]);

  // Keep the current result visible whenever results become available or the
  // active result changes. Deferred a frame so layout-heavy integrations
  // (e.g. paginated documents) have settled before measuring.
  useEffect(() => {
    if (
      appliedSearchTerm.length === 0 ||
      total === 0 ||
      currentIndex === null
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      scrollCurrentResultIntoView(editor, scrollIntoViewOptions);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [editor, total, currentIndex, appliedSearchTerm, scrollIntoViewOptions]);

  const isEditable = editor?.isEditable === true;
  const canNavigate = canSearch && total > 0;
  const hasReplaceTerm = replaceTerm.length > 0;

  const canReplaceAll = canNavigate && isEditable && hasReplaceTerm;
  const canReplace = canReplaceAll && currentIndex !== null;

  return {
    Icon: SearchIcon,
    appliedSearchTerm,
    applySearch,
    canNavigate,
    canReplace,
    canReplaceAll,
    canSearch,
    caseSensitive,
    clearSearch,
    currentIndex,
    editor,
    goToNext,
    goToPrevious,
    isVisible,
    label: "Search and replace",
    replaceAll,
    replaceCurrent,
    replaceTerm,
    resultCountLabel: formatResultCount(currentIndex, total),
    searchTerm,
    setReplaceTerm,
    setSearchTerm,
    shortcutKeys: SEARCH_AND_REPLACE_SHORTCUT_KEY,
    suspendSearch,
    toggleCaseSensitive,
    toggleUseRegex,
    toggleWholeWord,
    total,
    useRegex: regexEnabled,
    wholeWord,
  };
}

export type UseSearchAndReplaceReturn = ReturnType<typeof useSearchAndReplace>;
