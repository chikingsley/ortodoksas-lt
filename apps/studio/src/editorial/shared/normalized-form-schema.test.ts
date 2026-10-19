import { describe, expect, it } from "vitest";
import { z } from "zod";

import { normalizedFormSchema } from "./normalized-form-schema";

describe("normalized form schema", () => {
  it("preserves synchronous validation and defaults for the form submission lane", () => {
    const schema = normalizedFormSchema(
      z.object({ title: z.string().default("Untitled") })
    );

    expect(schema["~standard"].validate({})).toStrictEqual({
      value: { title: "Untitled" },
    });
  });

  it("preserves explicitly asynchronous schema validation", async () => {
    const schema = normalizedFormSchema(
      z.string().transform(async (value) => await Promise.resolve(value.trim()))
    );

    await expect(
      schema["~standard"].validate(" title ")
    ).resolves.toStrictEqual({ value: "title" });
  });
});
