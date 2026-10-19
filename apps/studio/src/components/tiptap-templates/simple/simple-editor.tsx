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
import type { Editor } from "@tiptap/react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { useCallback, useMemo, useRef, useState } from "react";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
import { EditableFigure } from "@/components/tiptap-node/figure-node/figure-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";

import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/figure-node/figure-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar/toolbar";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from "@/components/tiptap-ui/color-highlight-popover/color-highlight-popover";
// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button/image-upload-button";
import {
  LinkButton,
  LinkContent,
  LinkPopover,
} from "@/components/tiptap-ui/link-popover/link-popover";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap-ui/mark-button/mark-button";
import {
  SearchAndReplace,
  SearchAndReplaceButton,
} from "@/components/tiptap-ui/search-and-replace/search-and-replace";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button/undo-redo-button";
// --- Lib ---
import {
  MAX_MEDIA_FILE_SIZE,
  uploadStudioMedia,
} from "@/editorial/shared/media-upload";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
import { useElementRect } from "@/hooks/use-element-rect";
// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { useWindowSize } from "@/hooks/use-window-size";
import { cn } from "@/lib/utils";

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";
import "@/styles/_keyframe-animations.scss";
import "@/styles/_variables.scss";

const SEARCH_AND_REPLACE_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  block: "center",
};

function MainToolbarContent({
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
}) {
  return (
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
}

function MobileToolbarContent({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) {
  return (
    <>
      <ToolbarGroup>
        <Button
          aria-label="Back to formatting tools"
          onClick={onBack}
          variant="ghost"
        >
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
}

function CompactToolbarContent({
  isMobile,
  onLinkClick,
}: {
  isMobile: boolean;
  onLinkClick: () => void;
}) {
  return (
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
}

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

  const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(
    null
  );

  const toolbarRect = useElementRect({
    element: toolbarElement,
    enabled: toolbarElement !== null,
  });

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
        maxSize: MAX_MEDIA_FILE_SIZE,
        onError: (error) => {
          console.error("Upload failed:", error);
        },
        type: "figure",
        upload: uploadStudioMedia,
      }),
    ],
    immediatelyRender: false,
    onCreate: ({ editor: createdEditor }) => onReady?.(createdEditor),
    onUpdate: ({ editor: updatedEditor }) =>
      onUpdate?.(updatedEditor.getJSON()),
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRect.height,
  });

  const [previousMobile, setPreviousMobile] = useState(isMobile);

  if (previousMobile !== isMobile) {
    setPreviousMobile(isMobile);
    setMobileView("main");
  }

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

  const openHighlighter = useCallback(() => {
    setMobileView("highlighter");
  }, []);

  const openLink = useCallback(() => {
    setMobileView("link");
  }, []);

  const showMainToolbar = useCallback(() => {
    setMobileView("main");
  }, []);

  const editorContext = useMemo(() => ({ editor }), [editor]);

  return (
    <div
      className={cn("simple-editor-wrapper", className)}
      data-variant={variant}
    >
      <EditorContext.Provider value={editorContext}>
        <Toolbar
          ref={setToolbarElement}
          data-mobile={isMobile}
          style={{
            "--toolbar-mobile-bottom": `calc(100% - ${height - rect.y}px)`,
          }}
        >
          {mobileView === "main" && variant === "compact" ? (
            <CompactToolbarContent isMobile={isMobile} onLinkClick={openLink} />
          ) : null}
          {mobileView === "main" && variant !== "compact" ? (
            <MainToolbarContent
              isMobile={isMobile}
              isSearchAndReplaceOpen={isSearchAndReplaceOpen}
              onHighlighterClick={openHighlighter}
              onLinkClick={openLink}
              onSearchAndReplaceClick={toggleSearchAndReplace}
              searchAndReplaceButtonRef={searchAndReplaceButtonRef}
            />
          ) : null}
          {mobileView === "main" ? null : (
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
