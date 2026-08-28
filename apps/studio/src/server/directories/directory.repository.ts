import {
  communityEditorSchema,
  personEditorSchema,
  prepareDirectoryRecordForEditing,
} from "@ortodoksas-lt/content/directory";
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

import type { StudioDatabase } from "../db.server";

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
    records: records.map((record) => {
      const {
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...person
      } = record;
      return {
        ...personEditorSchema.parse(
          prepareDirectoryRecordForEditing({
            ...person,
            contacts: contacts
              .filter((item) => item.personId === record.id)
              .map(
                ({
                  createdAt: _contactCreatedAt,
                  personId: _personId,
                  updatedAt: _contactUpdatedAt,
                  ...item
                }) => ({
                  ...item,
                  localizations: contactLocalizations
                    .filter((value) => value.personContactId === item.id)
                    .map(({ personContactId: _id, ...value }) => value),
                })
              ),
            localizations: localizations
              .filter((item) => item.personId === record.id)
              .map(({ biographyJson, personId: _id, ...item }) => ({
                ...item,
                biography: JSON.parse(biographyJson),
              })),
            media: media
              .filter((item) => item.personId === record.id)
              .map(
                ({
                  createdAt: _mediaCreatedAt,
                  personId: _personId,
                  ...item
                }) => ({
                  ...item,
                  localizations: mediaLocalizations
                    .filter((value) => value.personMediaId === item.id)
                    .map(({ personMediaId: _id, ...value }) => value),
                })
              ),
            positions: positions
              .filter((item) => item.personId === record.id)
              .map(
                ({
                  createdAt: _positionCreatedAt,
                  personId: _personId,
                  updatedAt: _positionUpdatedAt,
                  ...item
                }) => ({
                  ...item,
                  localizations: positionLocalizations
                    .filter((value) => value.positionId === item.id)
                    .map(({ positionId: _id, ...value }) => value),
                })
              ),
          })
        ),
        id: record.id,
      };
    }),
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
    records: records.map((record) => {
      const {
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...community
      } = record;
      return {
        ...communityEditorSchema.parse(
          prepareDirectoryRecordForEditing({
            ...community,
            contacts: contacts
              .filter((item) => item.communityId === record.id)
              .map(
                ({
                  communityId: _communityId,
                  createdAt: _contactCreatedAt,
                  updatedAt: _contactUpdatedAt,
                  ...item
                }) => ({
                  ...item,
                  localizations: contactLocalizations
                    .filter((value) => value.communityContactId === item.id)
                    .map(({ communityContactId: _id, ...value }) => value),
                })
              ),
            localizations: localizations
              .filter((item) => item.communityId === record.id)
              .map(({ communityId: _id, ...item }) => item),
            media: media
              .filter((item) => item.communityId === record.id)
              .map(
                ({
                  communityId: _communityId,
                  createdAt: _mediaCreatedAt,
                  ...item
                }) => ({
                  ...item,
                  localizations: mediaLocalizations
                    .filter((value) => value.communityMediaId === item.id)
                    .map(({ communityMediaId: _id, ...value }) => value),
                })
              ),
            services: services
              .filter((item) => item.communityId === record.id)
              .map(
                ({
                  communityId: _communityId,
                  createdAt: _serviceCreatedAt,
                  updatedAt: _serviceUpdatedAt,
                  ...item
                }) => ({
                  ...item,
                  localizations: serviceLocalizations
                    .filter((value) => value.communityServiceId === item.id)
                    .map(({ communityServiceId: _id, ...value }) => value),
                })
              ),
          })
        ),
        id: record.id,
      };
    }),
  };
};
