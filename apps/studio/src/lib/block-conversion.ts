import type { Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

import {
  findNodePosition,
  getSelectedBlockNodes,
  isValidPosition,
  selectionWithinConvertibleTypes,
} from "@/lib/tiptap-utils";

const convertibleTypes = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
];

function textSelectionInsideNode(state: EditorState, selection: NodeSelection) {
  const firstChild = selection.node.firstChild?.firstChild;
  const lastChild = selection.node.lastChild?.lastChild;

  const from = firstChild
    ? selection.from + firstChild.nodeSize
    : selection.from + 1;

  const to = lastChild ? selection.to - lastChild.nodeSize : selection.to - 1;

  return TextSelection.between(state.doc.resolve(from), state.doc.resolve(to));
}

export function createBlockConversionChain(editor: Editor) {
  const { view } = editor;
  const initialState = view.state;

  const singleConvertibleBlock =
    selectionWithinConvertibleTypes(editor, convertibleTypes) &&
    getSelectedBlockNodes(editor).length === 1;

  if (
    (initialState.selection.empty ||
      initialState.selection instanceof TextSelection) &&
    singleConvertibleBlock
  ) {
    const pos = findNodePosition({
      editor,
      node: initialState.selection.$anchor.node(1),
    })?.pos;

    if (!isValidPosition(pos)) {
      return null;
    }

    view.dispatch(
      initialState.tr.setSelection(NodeSelection.create(initialState.doc, pos))
    );
  }

  const { state } = view;
  const chain = editor.chain().focus();

  return state.selection instanceof NodeSelection
    ? chain
        .setTextSelection(textSelectionInsideNode(state, state.selection))
        .clearNodes()
    : chain;
}
