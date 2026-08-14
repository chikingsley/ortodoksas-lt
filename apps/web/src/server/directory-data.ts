import {
  communities,
  communityContactLocalizations,
  communityContacts,
  communityLocalizations,
  communityMedia,
  communityMediaLocalizations,
  communityServiceLocalizations,
  communityServices,
  people,
  personContactLocalizations,
  personContacts,
  personLocalizations,
  personMedia,
  personMediaLocalizations,
  personPositionLocalizations,
  personPositions,
} from "@ortodoksas-lt/db";
import { renderArticleBody } from "@ortodoksas-lt/editor/render";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { SiteLocale } from "../i18n/config";
import { database } from "./publication-data";

export async function getPeopleDirectory(locale: SiteLocale) {
  const records = await database()
    .select({
      biographyJson: personLocalizations.biographyJson,
      displayName: personLocalizations.displayName,
      id: people.id,
      seoDescription: personLocalizations.seoDescription,
      slug: people.slug,
    })
    .from(people)
    .innerJoin(
      personLocalizations,
      and(
        eq(personLocalizations.personId, people.id),
        eq(personLocalizations.language, locale)
      )
    )
    .where(eq(people.status, "published"))
    .orderBy(asc(people.sortOrder));
  const ids = records.map(({ id }) => id);
  if (ids.length === 0) {
    return [];
  }
  const [positions, contacts, media] = await Promise.all([
    database()
      .select({
        description: personPositionLocalizations.description,
        personId: personPositions.personId,
        roleKey: personPositions.roleKey,
        title: personPositionLocalizations.title,
      })
      .from(personPositions)
      .innerJoin(
        personPositionLocalizations,
        and(
          eq(personPositionLocalizations.positionId, personPositions.id),
          eq(personPositionLocalizations.language, locale)
        )
      )
      .where(inArray(personPositions.personId, ids))
      .orderBy(asc(personPositions.sortOrder)),
    database()
      .select({
        href: personContacts.href,
        kind: personContacts.kind,
        label: personContactLocalizations.label,
        personId: personContacts.personId,
      })
      .from(personContacts)
      .innerJoin(
        personContactLocalizations,
        and(
          eq(personContactLocalizations.personContactId, personContacts.id),
          eq(personContactLocalizations.language, locale)
        )
      )
      .where(inArray(personContacts.personId, ids))
      .orderBy(asc(personContacts.sortOrder)),
    database()
      .select({
        altText: personMediaLocalizations.altText,
        caption: personMediaLocalizations.caption,
        mediaId: personMedia.mediaId,
        personId: personMedia.personId,
        role: personMedia.role,
      })
      .from(personMedia)
      .innerJoin(
        personMediaLocalizations,
        and(
          eq(personMediaLocalizations.personMediaId, personMedia.id),
          eq(personMediaLocalizations.language, locale)
        )
      )
      .where(inArray(personMedia.personId, ids))
      .orderBy(asc(personMedia.sortOrder)),
  ]);
  return records.map(({ biographyJson, ...record }) => ({
    ...record,
    biographyHtml: renderArticleBody(JSON.parse(biographyJson)),
    contacts: contacts.filter(({ personId }) => personId === record.id),
    media: media.filter(({ personId }) => personId === record.id),
    positions: positions.filter(({ personId }) => personId === record.id),
  }));
}

export async function getCommunityDirectory(locale: SiteLocale) {
  const records = await database()
    .select({
      addressLabel: communityLocalizations.addressLabel,
      description: communityLocalizations.description,
      id: communities.id,
      name: communityLocalizations.name,
      operationalNotice: communityLocalizations.operationalNotice,
      operationalStatus: communities.operationalStatus,
      slug: communities.slug,
    })
    .from(communities)
    .innerJoin(
      communityLocalizations,
      and(
        eq(communityLocalizations.communityId, communities.id),
        eq(communityLocalizations.language, locale)
      )
    )
    .where(eq(communities.status, "published"))
    .orderBy(asc(communities.sortOrder));
  const ids = records.map(({ id }) => id);
  if (ids.length === 0) {
    return [];
  }
  const [contacts, services, media] = await Promise.all([
    database()
      .select({
        communityId: communityContacts.communityId,
        href: communityContacts.href,
        kind: communityContacts.kind,
        label: communityContactLocalizations.label,
      })
      .from(communityContacts)
      .innerJoin(
        communityContactLocalizations,
        and(
          eq(
            communityContactLocalizations.communityContactId,
            communityContacts.id
          ),
          eq(communityContactLocalizations.language, locale)
        )
      )
      .where(inArray(communityContacts.communityId, ids))
      .orderBy(asc(communityContacts.sortOrder)),
    database()
      .select({
        communityId: communityServices.communityId,
        scheduleText: communityServiceLocalizations.scheduleText,
      })
      .from(communityServices)
      .innerJoin(
        communityServiceLocalizations,
        and(
          eq(
            communityServiceLocalizations.communityServiceId,
            communityServices.id
          ),
          eq(communityServiceLocalizations.language, locale)
        )
      )
      .where(inArray(communityServices.communityId, ids))
      .orderBy(asc(communityServices.sortOrder)),
    database()
      .select({
        altText: communityMediaLocalizations.altText,
        caption: communityMediaLocalizations.caption,
        communityId: communityMedia.communityId,
        mediaId: communityMedia.mediaId,
        role: communityMedia.role,
      })
      .from(communityMedia)
      .innerJoin(
        communityMediaLocalizations,
        and(
          eq(communityMediaLocalizations.communityMediaId, communityMedia.id),
          eq(communityMediaLocalizations.language, locale)
        )
      )
      .where(inArray(communityMedia.communityId, ids))
      .orderBy(asc(communityMedia.sortOrder)),
  ]);
  return records.map((record) => ({
    ...record,
    contacts: contacts.filter(({ communityId }) => communityId === record.id),
    media: media.filter(({ communityId }) => communityId === record.id),
    services: services.filter(({ communityId }) => communityId === record.id),
  }));
}
