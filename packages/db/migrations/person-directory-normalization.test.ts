import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import normalizationMigration from "./0014_person_directory_normalization.sql?raw";

describe("person directory normalization migration", () => {
  const databases: DatabaseSync[] = [];

  afterEach(() => {
    for (const database of databases) {
      database.close();
    }
    databases.length = 0;
  });

  it("separates honorifics, cleans biographies, and fills search metadata", () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    database.exec(`
      CREATE TABLE person_localizations (
        person_id TEXT NOT NULL,
        language TEXT NOT NULL,
        display_name TEXT NOT NULL,
        biography_json TEXT NOT NULL,
        seo_description TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (person_id, language)
      );
      CREATE TABLE person_contacts (
        id TEXT PRIMARY KEY,
        href TEXT NOT NULL
      );
      CREATE TABLE person_contact_localizations (
        person_contact_id TEXT NOT NULL,
        language TEXT NOT NULL,
        label TEXT NOT NULL,
        PRIMARY KEY (person_contact_id, language)
      );
      CREATE TABLE person_media (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL
      );
      CREATE TABLE person_media_localizations (
        person_media_id TEXT NOT NULL,
        language TEXT NOT NULL,
        alt_text TEXT NOT NULL,
        PRIMARY KEY (person_media_id, language)
      );

      INSERT INTO person_localizations VALUES (
        'person-panaretos',
        'lt',
        'Jo Ekselencija Panaretas',
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"–  Biografija su artefaktu."}]}]}',
        ''
      );
      INSERT INTO person_contacts VALUES ('contact-1', ' mailto:test@example.com ');
      INSERT INTO person_contact_localizations VALUES ('contact-1', 'lt', ' El. paštas ');
      INSERT INTO person_media VALUES ('media-1', 'person-panaretos');
      INSERT INTO person_media_localizations VALUES ('media-1', 'lt', 'Senas aprašas');
    `);

    database.exec(
      normalizationMigration.replaceAll("--> statement-breakpoint", "")
    );

    const person = database
      .prepare(
        `SELECT honorific, display_name, alternate_name, biography_json, seo_description
         FROM person_localizations
         WHERE person_id = 'person-panaretos' AND language = 'lt'`
      )
      .get() as Record<string, string>;
    expect(person.honorific).toBe("Jo Ekselencija");
    expect(person.display_name).toBe("Panaretas");
    expect(person.alternate_name).toBe("");
    expect(JSON.parse(person.biography_json)).toMatchObject({
      content: [{ content: [{ text: "Biografija su artefaktu." }] }],
    });
    expect(person.seo_description).toContain("Jo Ekselencija Panaretas");

    expect(database.prepare("SELECT href FROM person_contacts").get()).toEqual({
      href: "mailto:test@example.com",
    });
    expect(
      database.prepare("SELECT label FROM person_contact_localizations").get()
    ).toEqual({ label: "El. paštas" });
    expect(
      database.prepare("SELECT alt_text FROM person_media_localizations").get()
    ).toEqual({ alt_text: "Jo Ekselencija Panaretas" });
  });
});
