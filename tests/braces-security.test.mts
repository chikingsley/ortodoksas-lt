import assert from "node:assert/strict";
import { test } from "node:test";

import braces from "braces";

interface Ast {
  nodes?: Ast[];
  type: string;
  value?: string;
}

// SAFETY: braces 3.0.3 exports these functions; its upstream declarations cover only expand.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exercise the package public API missing from its declarations.
const api = braces as typeof braces & {
  compile: (pattern: string | Ast) => string;
  expand: (pattern: string | Ast) => string[];
  parse: (pattern: string) => Ast;
  stringify: (ast: Ast) => string;
};

const depthError = {
  message: "Pattern nesting exceeds maximum depth",
  name: "SyntaxError",
};

await Promise.all(
  (
    [
      ["{", "}"],
      ["(", ")"],
    ] as const
  ).map(async ([open, close]) => {
    await test(`deeply nested ${open}${close} patterns fail with a bounded validation error`, () => {
      const pattern = `${open.repeat(3000)}a${close.repeat(3000)}`;
      assert.throws(() => api.parse(pattern), depthError);
      assert.throws(() => api.compile(pattern), depthError);
      assert.throws(() => api.expand(pattern), depthError);
    });
  })
);

await test("ordinary alternatives, ranges and nested groups keep their meaning", () => {
  assert.deepEqual(api.expand("file-{a,b}-{1..3}.md"), [
    "file-a-1.md",
    "file-a-2.md",
    "file-a-3.md",
    "file-b-1.md",
    "file-b-2.md",
    "file-b-3.md",
  ]);
  assert.deepEqual(api.expand("{a,{b,c}}"), ["a", "b", "c"]);
  assert.equal(
    api.stringify(api.parse("src/{app,lib}/*.ts")),
    "src/{app,lib}/*.ts"
  );
});

await test("recursive entry points also bound caller-supplied syntax trees", () => {
  let ast: Ast = { type: "text", value: "x" };

  for (let index = 0; index < 3000; index += 1) {
    ast = { nodes: [ast], type: "root" };
  }

  assert.throws(() => api.compile(ast), depthError);
  assert.throws(() => api.expand(ast), depthError);
  assert.throws(() => api.stringify(ast), depthError);
});
