import type { StandardSchemaV1 } from "@tanstack/react-form";

/**
 * TanStack Form validates an editor's normalized value. Content schemas may
 * accept a wider input because they apply defaults during parsing. This keeps
 * the schema's field paths while aligning its input with the form value.
 */
export const normalizedFormSchema = <TInput, TOutput extends TInput>(
  schema: StandardSchemaV1<TInput, TOutput>
): StandardSchemaV1<TOutput, TOutput> =>
  schema as StandardSchemaV1<TOutput, TOutput>;
