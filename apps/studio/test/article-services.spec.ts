import type { UpdateArticleInput } from "@ortodoksas-lt/content/article";
import { describe, expect, it } from "vitest";

import {
  hashText,
  textChangeProvenance,
} from "../worker/services/article-content";
import {
  publicArticleUrl,
  publicationTimestamp,
} from "../worker/services/article-publication";
import { translationMetadataUpdate } from "../worker/services/article-translation";

describe("article service contracts", () => {
  it("builds canonical public URLs for Lithuanian and localized articles", () => {
    expect(
      publicArticleUrl("https://publication.test", "lt", "/news/example.html")
    ).toBe("https://publication.test/news/example");
    expect(
      publicArticleUrl("https://publication.test/", "en", "news/example")
    ).toBe("https://publication.test/en/news/example");
  });

  it("assigns and preserves publication timestamps", () => {
    expect(publicationTimestamp("published", undefined, 123)).toBe(123);
    expect(publicationTimestamp("published", 456, 123)).toBe(456);
    expect(publicationTimestamp("draft", undefined, 123)).toBeNull();
    expect(publicationTimestamp("draft", 456, 123)).toBe(456);
  });

  it("distinguishes normalized text from editorial changes", () => {
    expect(textChangeProvenance(" Title ", "Title")).toBe("normalized");
    expect(textChangeProvenance("Title", "New title")).toBe("manual");
  });

  it("hashes text with the Worker-compatible Web Crypto contract", async () => {
    await expect(hashText("ortodoksas")).resolves.toBe(
      "b0909a91b9d98674b76316b7db249c020230cc6a9b9555c6ebd90f5632c62d53"
    );
  });

  it("selects translation metadata for an article update", () => {
    const update: UpdateArticleInput = {
      body: { content: [{ type: "paragraph" }], type: "doc" },
      expectedVersion: 1,
      heroFit: "cover",
      heroFocalX: 50,
      heroFocalY: 50,
      labels: [],
      language: "en",
      section: "News",
      slug: "example",
      status: "draft",
      summary: "Example summary",
      title: "Example",
      translationKind: "human",
      translationReviewAction: "approve",
    };

    expect(
      translationMetadataUpdate(
        {
          action: update.translationReviewAction,
          contentChanged: false,
          currentStatus: "pending",
        },
        {
          editorId: "server-editor",
          timestamp: 789,
        }
      )
    ).toEqual({
      translationReviewedAt: 789,
      translationReviewedBy: "server-editor",
      translationReviewStatus: "approved",
    });

    expect(
      translationMetadataUpdate(
        {
          action: "request_changes",
          contentChanged: false,
          currentStatus: "approved",
        },
        { editorId: "server-editor", timestamp: 790 }
      )
    ).toEqual({
      translationReviewedAt: null,
      translationReviewedBy: null,
      translationReviewStatus: "changes_requested",
    });

    expect(
      translationMetadataUpdate(
        {
          action: undefined,
          contentChanged: false,
          currentStatus: "approved",
        },
        { editorId: "server-editor", timestamp: 791 }
      )
    ).toEqual({});

    expect(
      translationMetadataUpdate(
        {
          action: undefined,
          contentChanged: true,
          currentStatus: "approved",
        },
        { editorId: "server-editor", timestamp: 792 }
      )
    ).toEqual({
      translationReviewedAt: null,
      translationReviewedBy: null,
      translationReviewStatus: "pending",
    });
  });
});
