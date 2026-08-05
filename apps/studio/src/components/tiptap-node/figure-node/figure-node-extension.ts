import { ReactNodeViewRenderer } from "@tiptap/react";
import { Figure } from "../../../../shared/editor/figure";

import { FigureNodeView } from "./figure-node";

export const EditableFigure = Figure.extend({
  addNodeView() {
    return ReactNodeViewRenderer(FigureNodeView);
  },
});
