import { Highlight } from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Youtube } from "@tiptap/extension-youtube";
import { StarterKit } from "@tiptap/starter-kit";

import { Figure } from "./figure";

export const articleContentExtensions = [
  StarterKit.configure({
    link: {
      enableClickSelection: true,
      openOnClick: false,
    },
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  Figure,
  Youtube.configure({
    HTMLAttributes: {
      class: "article-youtube",
      loading: "lazy",
      title: "YouTube video",
    },
    height: 360,
    nocookie: true,
    width: 640,
  }),
  Typography,
  Superscript,
  Subscript,
];

export const articleEditorExtensions = articleContentExtensions;
