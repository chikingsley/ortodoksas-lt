"use client";

import type { JSONContent } from "@tiptap/core";
import { FindAndReplace } from "@tiptap/extension-find-and-replace";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import {
  type Editor,
  EditorContent,
  EditorContext,
  useEditor,
} from "@tiptap/react";
// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditableFigure } from "@/components/tiptap-node/figure-node/figure-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/figure-node/figure-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from "@/components/tiptap-ui/color-highlight-popover";
// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import {
  LinkButton,
  LinkContent,
  LinkPopover,
} from "@/components/tiptap-ui/link-popover";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import {
  SearchAndReplace,
  SearchAndReplaceButton,
} from "@/components/tiptap-ui/search-and-replace";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { useWindowSize } from "@/hooks/use-window-size";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { cn } from "@/lib/utils";

// --- Styles ---
import "@/styles/_variables.scss";
import "@/styles/_keyframe-animations.scss";
import "@/components/tiptap-templates/simple/simple-editor.scss";

const SEARCH_AND_REPLACE_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  block: "center",
};

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  onSearchAndReplaceClick,
  isSearchAndReplaceOpen,
  searchAndReplaceButtonRef,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  onSearchAndReplaceClick: () => void;
  isSearchAndReplaceOpen: boolean;
  searchAndReplaceButtonRef: React.RefObject<HTMLButtonElement | null>;
  isMobile: boolean;
}) => (
  <>
    <Spacer />

    <ToolbarGroup>
      <UndoRedoButton action="undo" />
      <UndoRedoButton action="redo" />
    </ToolbarGroup>

    <ToolbarSeparator />

    <ToolbarGroup>
      <HeadingDropdownMenu levels={[1, 2, 3, 4]} modal={false} />
      <ListDropdownMenu
        modal={false}
        types={["bulletList", "orderedList", "taskList"]}
      />
      <BlockquoteButton />
      <CodeBlockButton />
    </ToolbarGroup>

    <ToolbarSeparator />

    <ToolbarGroup>
      <MarkButton type="bold" />
      <MarkButton type="italic" />
      <MarkButton type="strike" />
      <MarkButton type="code" />
      <MarkButton type="underline" />
      {isMobile ? (
        <ColorHighlightPopoverButton onClick={onHighlighterClick} />
      ) : (
        <ColorHighlightPopover />
      )}
      {isMobile ? <LinkButton onClick={onLinkClick} /> : <LinkPopover />}
    </ToolbarGroup>

    <ToolbarSeparator />

    <ToolbarGroup>
      <MarkButton type="superscript" />
      <MarkButton type="subscript" />
    </ToolbarGroup>

    <ToolbarSeparator />

    <ToolbarGroup>
      <TextAlignButton align="left" />
      <TextAlignButton align="center" />
      <TextAlignButton align="right" />
      <TextAlignButton align="justify" />
    </ToolbarGroup>

    <ToolbarSeparator />

    <ToolbarGroup>
      <ImageUploadButton text="Add" />
    </ToolbarGroup>

    <Spacer />

    {isMobile && <ToolbarSeparator />}

    <ToolbarGroup>
      <SearchAndReplaceButton
        aria-expanded={isSearchAndReplaceOpen}
        data-active-state={isSearchAndReplaceOpen ? "on" : "off"}
        onClick={onSearchAndReplaceClick}
        ref={searchAndReplaceButtonRef}
      />
      <ThemeToggle />
    </ToolbarGroup>
  </>
);

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button onClick={onBack} variant="ghost">
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

const CompactToolbarContent = ({
  isMobile,
  onLinkClick,
}: {
  isMobile: boolean;
  onLinkClick: () => void;
}) => (
  <>
    <ToolbarGroup>
      <UndoRedoButton action="undo" />
      <UndoRedoButton action="redo" />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <MarkButton type="bold" />
      <MarkButton type="italic" />
      {isMobile ? <LinkButton onClick={onLinkClick} /> : <LinkPopover />}
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <ListDropdownMenu modal={false} types={["bulletList", "orderedList"]} />
    </ToolbarGroup>
  </>
);

interface SimpleEditorProps {
  ariaLabel?: string;
  className?: string;
  content: JSONContent;
  onReady?: (editor: Editor) => void;
  onUpdate?: (content: JSONContent) => void;
  variant?: "article" | "compact";
}

export function SimpleEditor({
  ariaLabel = "Main content area, start typing to enter text.",
  className,
  content,
  onReady,
  onUpdate,
  variant = "article",
}: SimpleEditorProps) {
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  );
  const [isSearchAndReplaceOpen, setIsSearchAndReplaceOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const searchAndReplaceButtonRef = useRef<HTMLButtonElement>(null);

  const editor = useEditor({
    content,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        autocapitalize: "off",
        autocomplete: "off",
        autocorrect: "off",
        class: "simple-editor",
        role: "textbox",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          enableClickSelection: true,
          openOnClick: false,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      EditableFigure,
      Typography,
      Superscript,
      Subscript,
      Selection,
      FindAndReplace.configure({
        injectCSS: false,
        searchDebounceMs: 500,
      }),
      ImageUploadNode.configure({
        accept: "image/*",
        limit: 3,
        maxSize: MAX_FILE_SIZE,
        onError: (error) => console.error("Upload failed:", error),
        type: "figure",
        upload: handleImageUpload,
      }),
    ],
    immediatelyRender: false,
    onCreate: ({ editor: createdEditor }) => onReady?.(createdEditor),
    onUpdate: ({ editor: updatedEditor }) =>
      onUpdate?.(updatedEditor.getJSON()),
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  const openSearchAndReplace = useCallback(() => {
    setMobileView("main");
    setIsSearchAndReplaceOpen(true);
  }, []);

  const closeSearchAndReplace = useCallback(() => {
    setIsSearchAndReplaceOpen(false);
    searchAndReplaceButtonRef.current?.focus();
  }, []);

  const toggleSearchAndReplace = useCallback(() => {
    if (isSearchAndReplaceOpen) {
      closeSearchAndReplace();
      return;
    }

    openSearchAndReplace();
  }, [closeSearchAndReplace, isSearchAndReplaceOpen, openSearchAndReplace]);
  const openHighlighter = useCallback(() => setMobileView("highlighter"), []);
  const openLink = useCallback(() => setMobileView("link"), []);
  const showMainToolbar = useCallback(() => setMobileView("main"), []);

  return (
    <div
      className={cn("simple-editor-wrapper", className)}
      data-variant={variant}
    >
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(variant === "article"
              ? {
                  borderBottom: "1px solid var(--tt-toolbar-border-color)",
                  borderTop: 0,
                  bottom: "auto",
                  height: "var(--tt-toolbar-height)",
                  paddingBottom: 0,
                  position: "sticky",
                  top: isMobile
                    ? "var(--studio-article-header-height)"
                    : "var(--studio-shell-header-height)",
                }
              : isMobile
                ? {
                    bottom: `calc(100% - ${height - rect.y}px)`,
                  }
                : {}),
          }}
        >
          {mobileView === "main" ? (
            variant === "compact" ? (
              <CompactToolbarContent
                isMobile={isMobile}
                onLinkClick={openLink}
              />
            ) : (
              <MainToolbarContent
                isMobile={isMobile}
                isSearchAndReplaceOpen={isSearchAndReplaceOpen}
                onHighlighterClick={openHighlighter}
                onLinkClick={openLink}
                onSearchAndReplaceClick={toggleSearchAndReplace}
                searchAndReplaceButtonRef={searchAndReplaceButtonRef}
              />
            )
          ) : (
            <MobileToolbarContent
              onBack={showMainToolbar}
              type={mobileView === "highlighter" ? "highlighter" : "link"}
            />
          )}
        </Toolbar>

        {variant === "article" ? (
          <SearchAndReplace
            className="simple-editor-search-and-replace"
            onClose={closeSearchAndReplace}
            onOpen={openSearchAndReplace}
            open={isSearchAndReplaceOpen}
            scrollIntoViewOptions={SEARCH_AND_REPLACE_SCROLL_OPTIONS}
          />
        ) : null}

        <EditorContent
          className="simple-editor-content"
          editor={editor}
          role="presentation"
        />
      </EditorContext.Provider>
    </div>
  );
}
