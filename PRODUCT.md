# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary readers are Lithuanian Orthodox Christians and people seeking reliable information about Orthodox faith, worship, communities, clergy, and church life. Editors need a straightforward browser-based workflow for publishing multilingual stories and assigning their homepage prominence.

## Product Purpose

ortodoksas.lt is a multilingual church publication. It combines current editorial work with a searchable historical article collection in Lithuanian, English, Russian, Ukrainian, and Belarusian.

## Operating Context

Readers arrive for current stories, service schedules, the church calendar, clergy information, library material, and archived articles. Editors work in the custom Studio, which writes canonical articles, revisions, translations, publication state, and media relationships to D1 and R2.

## Capabilities and Constraints

- Astro generates static publication routes from a canonical D1 export.
- The Cloudflare Worker serves static assets, D1-backed publication endpoints, and R2 media.
- Studio uses Tiptap for article bodies and Drizzle for every D1 read and write.
- The main story and supporting stories use editor-selected homepage placement with deterministic chronological fallback behavior.
- The historical source archive lives outside the application repository as a public evidence dataset.

## Brand Commitments

- C: Institutional Edition is the approved visual direction.
- The Ecumenical Patriarchate emblem always appears at the far left of the masthead.
- The exact client-supplied Exarchate PNG is the production lockup.
- The publication name `ortodoksas.lt` remains visible beside the institutional marks.
- The supplied institutional palette, Playfair Display, Arimo, and extracted Canva motifs form the visual system.

## Evidence on Hand

The repository contains the approved institutional marks, curated brand assets and motifs, design decisions, public Astro application, editorial Studio, shared content contracts, and Cloudflare configuration. The historical crawl and migration evidence lives in its dedicated public dataset.

## Product Principles

- Put institutional identity and publication identity together without obscuring either.
- Make current stories immediately scannable and preserve deep archive access.
- Let editors publish and promote a story through explicit, understandable fields.
- Keep multilingual content within one repeatable publishing workflow.
