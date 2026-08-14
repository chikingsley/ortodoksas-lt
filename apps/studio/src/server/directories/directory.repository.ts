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
import { asc } from "drizzle-orm";

import type { StudioDatabase } from "../../../worker/db";

export const listPeopleDirectory = async (database: StudioDatabase) => {
  const [
    records,
    localizations,
    contacts,
    contactLocalizations,
    positions,
    positionLocalizations,
    media,
    mediaLocalizations,
  ] = await Promise.all([
    database.select().from(people).orderBy(asc(people.sortOrder)),
    database.select().from(personLocalizations),
    database
      .select()
      .from(personContacts)
      .orderBy(asc(personContacts.sortOrder)),
    database.select().from(personContactLocalizations),
    database
      .select()
      .from(personPositions)
      .orderBy(asc(personPositions.sortOrder)),
    database.select().from(personPositionLocalizations),
    database.select().from(personMedia).orderBy(asc(personMedia.sortOrder)),
    database.select().from(personMediaLocalizations),
  ]);

  return {
    contactLocalizations,
    contacts,
    localizations: localizations.map(({ biographyJson, ...localization }) => ({
      ...localization,
      biography: JSON.parse(biographyJson),
    })),
    media,
    mediaLocalizations,
    positionLocalizations,
    positions,
    records,
  };
};

export const listCommunityDirectory = async (database: StudioDatabase) => {
  const [
    records,
    localizations,
    contacts,
    contactLocalizations,
    services,
    serviceLocalizations,
    media,
    mediaLocalizations,
  ] = await Promise.all([
    database.select().from(communities).orderBy(asc(communities.sortOrder)),
    database.select().from(communityLocalizations),
    database
      .select()
      .from(communityContacts)
      .orderBy(asc(communityContacts.sortOrder)),
    database.select().from(communityContactLocalizations),
    database
      .select()
      .from(communityServices)
      .orderBy(asc(communityServices.sortOrder)),
    database.select().from(communityServiceLocalizations),
    database
      .select()
      .from(communityMedia)
      .orderBy(asc(communityMedia.sortOrder)),
    database.select().from(communityMediaLocalizations),
  ]);

  return {
    contactLocalizations,
    contacts,
    localizations,
    media,
    mediaLocalizations,
    records,
    serviceLocalizations,
    services,
  };
};
