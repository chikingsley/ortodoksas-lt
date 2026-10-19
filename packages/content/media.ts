/* oxlint-disable promise/prefer-await-to-then -- Zod .catch defines synchronous field fallbacks. */
import { z } from "zod";

const provenanceSchema = z.enum(["generated", "manual", "missing", "source"]);

// Imported documents can predate individual media fields. Parse each field
// independently so one malformed legacy attribute preserves the remaining image.
export const figureAttributesSchema = z.object({
  alt: z.string().catch(""),
  altProvenance: provenanceSchema.catch("missing"),
  captionProvenance: provenanceSchema.catch("missing"),
  credit: z.string().catch(""),
  height: z.number().int().positive().nullable().catch(null),
  mediaId: z.string().nullable().catch(null),
  role: z.enum(["content", "lead"]).catch("content"),
  sourceAlt: z.string().catch(""),
  sourceCaption: z.string().catch(""),
  src: z.string().catch(""),
  title: z.string().nullable().catch(null),
  width: z.number().int().positive().nullable().catch(null),
});

export type FigureAttributeValues = z.infer<typeof figureAttributesSchema>;
