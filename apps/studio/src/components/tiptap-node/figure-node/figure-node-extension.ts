import { Figure } from "@ortodoksas-lt/editor/figure";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { FigureNodeView } from "./figure-node";

export const EditableFigure = Figure.extend({
  addNodeView() {
    return ReactNodeViewRenderer(FigureNodeView);
  },
});
