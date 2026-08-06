import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
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
  // Retained for revision compatibility. New conversion and upload paths emit figures.
  Image.configure({ allowBase64: false }),
  Typography,
  Superscript,
  Subscript,
];

export const articleEditorExtensions = articleContentExtensions;
