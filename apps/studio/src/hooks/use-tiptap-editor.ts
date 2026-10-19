import type { Editor } from "@tiptap/react";
import { useCurrentEditor, useEditorState } from "@tiptap/react";

// Studio edits a single document. Tiptap's subscription keeps toolbar state
// current while useEditor avoids rerendering the entire editor on each change.
export function useTiptapEditor(providedEditor?: Editor | null) {
  const { editor: contextEditor } = useCurrentEditor();
  const editor = providedEditor ?? contextEditor;

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      editor: current,
      editorState: current?.state,
    }),
  });

  return { editor, editorState: state?.editorState };
}
