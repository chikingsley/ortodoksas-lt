import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import cleanupMigration from "../../../packages/db/migrations/0012_blogger_content_cleanup.sql?raw";
import linkTextRepairMigration from "../../../packages/db/migrations/0013_repair_malformed_publication_link_text.sql?raw";
import baselineMediaMigration from "../../../packages/db/migrations/0015_canonicalize_baseline_media.sql?raw";
import externalReferenceRepairMigration from "../../../packages/db/migrations/0016_repair_external_reference_url.sql?raw";

const mediaId = `media_${"a".repeat(64)}`;
const recoveredSource = "https://legacy.example/recovered.jpg";
const unresolvedSource = "https://legacy.example/unresolved.jpg";
const malformedInternalLinkText =
  "http://ortodhttp://ortodoksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.htmloksas.blogspot.com/2013/11/sv-jono-auksaburnio-liturgija-su.html";
const malformedExternalReference =
  "http://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html,";
const canonicalExternalReference =
  "https://www.religion.in.ua/news/ukrainian_news/24945-sinod-upc-kp-viznachiv-pripiniti-pominannya-vladi-za-bogosluzhinnyam.html";

const linkDocument = JSON.stringify({
  content: [
    {
      content: [
        {
          marks: [
            {
              attrs: {
                href: "http://ortodoksas.blogspot.com/2020/01/story.html",
              },
              type: "link",
            },
          ],
          text: "http://ortodoksas.blogspot.com/2020/01/story.html",
          type: "text",
        },
        {
          marks: [
            {
              attrs: { href: "https://example.com/reference.html" },
              type: "link",
            },
          ],
          text: "External reference",
          type: "text",
        },
        {
          marks: [
            {
              attrs: {
                href: "/2013/11/sv-jono-auksaburnio-liturgija-su",
              },
              type: "link",
            },
          ],
          text: malformedInternalLinkText,
          type: "text",
        },
        {
          marks: [
            {
              attrs: { href: malformedExternalReference },
              type: "link",
            },
          ],
          text: malformedExternalReference,
          type: "text",
        },
      ],
      type: "paragraph",
    },
  ],
  type: "doc",
});

const figureDocument = (source: string) =>
  JSON.stringify({
    content: [
      {
        attrs: { mediaId: null, src: source },
        type: "figure",
      },
    ],
    type: "doc",
  });

describe("Blogger content cleanup migration", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE media_assets (id TEXT PRIMARY KEY, source_url TEXT);
      CREATE TABLE media_aliases (
        alias TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE articles (
        id TEXT PRIMARY KEY,
        body_json TEXT NOT NULL,
        source_article_id TEXT,
        source_capture TEXT,
        source_html TEXT,
        source_url TEXT
      );
      CREATE TABLE article_revisions (
        id TEXT PRIMARY KEY,
        body_json TEXT NOT NULL,
        metadata_json TEXT NOT NULL
      );
      CREATE TABLE article_baselines (
        article_id TEXT PRIMARY KEY,
        body_json TEXT NOT NULL
      );
    `);
    database
      .prepare("INSERT INTO media_assets (id, source_url) VALUES (?, ?)")
      .run(mediaId, recoveredSource);
    database
      .prepare(
        "INSERT INTO media_aliases (alias, media_id, created_at) VALUES (?, ?, 1)"
      )
      .run(recoveredSource, mediaId);
    database
      .prepare(
        `INSERT INTO articles (
          id, body_json, source_article_id, source_capture, source_html, source_url
        ) VALUES ('article', ?, 'legacy.json', 'capture', '<p>source</p>', 'https://legacy.example')`
      )
      .run(linkDocument);
    database
      .prepare(
        "INSERT INTO article_revisions (id, body_json, metadata_json) VALUES ('revision', ?, ?)"
      )
      .run(
        figureDocument(recoveredSource),
        JSON.stringify({
          sourceArticleId: "legacy.json",
          sourceCapture: "capture",
          sourceUrl: "https://legacy.example",
          title: "Historical revision",
        })
      );
    database
      .prepare(
        "INSERT INTO article_baselines (article_id, body_json) VALUES ('baseline', ?)"
      )
      .run(figureDocument(unresolvedSource));
  });

  afterEach(() => database.close());

  it("canonicalizes recoverable content and retires live source storage", () => {
    database.exec(cleanupMigration.replaceAll("--> statement-breakpoint", ""));
    database.exec(
      linkTextRepairMigration.replaceAll("--> statement-breakpoint", "")
    );
    database.exec(
      externalReferenceRepairMigration.replaceAll(
        "--> statement-breakpoint",
        ""
      )
    );

    const article = JSON.parse(
      String(
        database
          .prepare("SELECT body_json FROM articles WHERE id = 'article'")
          .get()?.body_json
      )
    );
    expect(article.content[0].content[0]).toMatchObject({
      marks: [{ attrs: { href: "/2020/01/story" } }],
      text: "https://ortodoksas.lt/2020/01/story",
    });
    expect(article.content[0].content[1]).toMatchObject({
      marks: [{ attrs: { href: "https://example.com/reference.html" } }],
    });
    expect(article.content[0].content[2]).toMatchObject({
      marks: [
        {
          attrs: { href: "/2013/11/sv-jono-auksaburnio-liturgija-su" },
        },
      ],
      text: "https://ortodoksas.lt/2013/11/sv-jono-auksaburnio-liturgija-su",
    });
    expect(article.content[0].content[3]).toMatchObject({
      marks: [{ attrs: { href: canonicalExternalReference } }],
      text: canonicalExternalReference,
    });

    const revision = database
      .prepare(
        "SELECT body_json, metadata_json FROM article_revisions WHERE id = 'revision'"
      )
      .get();
    expect(JSON.parse(String(revision?.body_json)).content[0].attrs).toEqual({
      mediaId,
      src: `/api/media/${mediaId}`,
    });
    expect(JSON.parse(String(revision?.metadata_json))).toEqual({
      title: "Historical revision",
    });

    const baseline = database
      .prepare(
        "SELECT body_json FROM article_baselines WHERE article_id = 'baseline'"
      )
      .get();
    expect(JSON.parse(String(baseline?.body_json)).content[0].attrs).toEqual({
      mediaId: null,
      src: unresolvedSource,
    });

    const sourceColumnCount = database
      .prepare(
        `SELECT COUNT(*) AS count
        FROM pragma_table_info('articles')
        WHERE name IN ('source_article_id', 'source_capture', 'source_html', 'source_url')`
      )
      .get()?.count;
    expect(sourceColumnCount).toBe(0);
    expect(
      database
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'media_aliases'"
        )
        .get()?.count
    ).toBe(0);
  });
});

describe("Baseline media canonicalization migration", () => {
  it("copies canonical media references from the matching current figures", () => {
    const database = new DatabaseSync(":memory:");
    const secondMediaId = `media_${"c".repeat(64)}`;
    const document = (firstAttrs: object, secondAttrs: object) =>
      JSON.stringify({
        content: [
          { attrs: firstAttrs, type: "figure" },
          {
            content: [{ attrs: secondAttrs, type: "figure" }],
            type: "blockquote",
          },
        ],
        type: "doc",
      });

    database.exec(`
      CREATE TABLE media_assets (id TEXT PRIMARY KEY, r2_key TEXT NOT NULL);
      CREATE TABLE articles (id TEXT PRIMARY KEY, body_json TEXT NOT NULL);
      CREATE TABLE article_baselines (
        article_id TEXT PRIMARY KEY,
        body_json TEXT NOT NULL
      );
    `);
    database
      .prepare("INSERT INTO media_assets (id, r2_key) VALUES (?, ?), (?, ?)")
      .run(
        mediaId,
        "media/originals/first.jpg",
        secondMediaId,
        "media/originals/second.jpg"
      );
    database
      .prepare("INSERT INTO articles (id, body_json) VALUES ('article', ?)")
      .run(
        document(
          { mediaId, src: `/api/media/${mediaId}` },
          { mediaId: secondMediaId, src: `/api/media/${secondMediaId}` }
        )
      );
    database
      .prepare(
        "INSERT INTO article_baselines (article_id, body_json) VALUES ('article', ?)"
      )
      .run(
        document(
          { mediaId: null, src: "https://legacy.example/first.jpg" },
          { mediaId: null, src: "https://legacy.example/second.jpg" }
        )
      );

    database.exec(
      baselineMediaMigration.replaceAll("--> statement-breakpoint", "")
    );

    const baseline = JSON.parse(
      String(
        database
          .prepare(
            "SELECT body_json FROM article_baselines WHERE article_id = 'article'"
          )
          .get()?.body_json
      )
    );
    expect(baseline.content[0].attrs).toEqual({
      mediaId,
      src: `/api/media/${mediaId}`,
    });
    expect(baseline.content[1].content[0].attrs).toEqual({
      mediaId: secondMediaId,
      src: `/api/media/${secondMediaId}`,
    });
    database.close();
  });
});
