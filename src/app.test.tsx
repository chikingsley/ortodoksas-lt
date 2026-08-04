import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import App from "./app";

describe("App", () => {
  it("renders its unchecked Worker state", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Project Template");
    expect(markup).toContain("Worker not checked yet");
  });
});
