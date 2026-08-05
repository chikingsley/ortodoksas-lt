# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary readers are Lithuanian Orthodox Christians and people seeking reliable information about Orthodox faith, worship, communities, clergy, and church life. Editors need a straightforward browser-based workflow for publishing multilingual stories and assigning their homepage prominence.

## Product Purpose

ortodoksas.lt is a church publication and recovered public archive. It preserves the historical publication while supporting new editorial work in Lithuanian, English, Russian, Ukrainian, and Belarusian.

## Operating Context

Readers arrive for current stories, service schedules, the church calendar, clergy information, library material, and archived articles. Editors work through Decap CMS, where editorial workflow creates reviewable GitHub changes before publication.

## Capabilities and Constraints

- Astro generates static publication routes and indexes recovered and editorial content together.
- Decap CMS stores multilingual JSON under `public/content/editorial`.
- Cloudflare Workers Static Assets serves the site and a narrow GitHub OAuth integration.
- The main story and up to three secondary stories use editor-selected homepage placement, with chronological fallbacks.
- Historical recovered content stays preserved as source material.

## Brand Commitments

- C: Institutional Edition is the approved visual direction.
- The Ecumenical Patriarchate emblem always appears at the far left of the masthead.
- The exact client-supplied Exarchate PNG is the production lockup.
- The publication name `ortodoksas.lt` remains visible beside the institutional marks.
- The supplied institutional palette, Playfair Display, Arimo, and extracted Canva motifs form the visual system.

## Evidence on Hand

The repository contains the client Exarchate lockup, an official Patriarchate emblem, the Canva reference export and extracted motifs, the approved C composition board, the recovered publication archive, and the current Decap/Cloudflare implementation.

## Product Principles

- Put institutional identity and publication identity together without obscuring either.
- Make current stories immediately scannable and preserve deep archive access.
- Let editors publish and promote a story through explicit, understandable fields.
- Keep multilingual content within one repeatable publishing workflow.
