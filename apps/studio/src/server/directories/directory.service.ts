import type {
  CommunityEditorInput,
  PersonEditorInput,
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
import { eq, inArray } from "drizzle-orm";

import type { StudioDatabase } from "../db.server";

const personPositionIds = (database: StudioDatabase, personId: string) =>
  database
    .select({ id: personPositions.id })
    .from(personPositions)
    .where(eq(personPositions.personId, personId));

const personMediaIds = (database: StudioDatabase, personId: string) =>
  database
    .select({ id: personMedia.id })
    .from(personMedia)
    .where(eq(personMedia.personId, personId));

const personContactIds = (database: StudioDatabase, personId: string) =>
  database
    .select({ id: personContacts.id })
    .from(personContacts)
    .where(eq(personContacts.personId, personId));

export const savePersonDirectory = async (input: {
  database: StudioDatabase;
  payload: PersonEditorInput;
}) => {
  const { database, payload } = input;
  const id = payload.id ?? crypto.randomUUID();
  const timestamp = Date.now();
  const positions = payload.positions.map((position) => ({
    ...position,
    id: position.id ?? crypto.randomUUID(),
  }));
  const media = payload.media.map((item) => ({
    ...item,
    id: item.id ?? crypto.randomUUID(),
  }));
  const contacts = payload.contacts.map((contact) => ({
    ...contact,
    id: contact.id ?? crypto.randomUUID(),
  }));

  await database.batch([
    database
      .delete(personContactLocalizations)
      .where(
        inArray(
          personContactLocalizations.personContactId,
          personContactIds(database, id)
        )
      ),
    database
      .delete(personPositionLocalizations)
      .where(
        inArray(
          personPositionLocalizations.positionId,
          personPositionIds(database, id)
        )
      ),
    database
      .delete(personMediaLocalizations)
      .where(
        inArray(
          personMediaLocalizations.personMediaId,
          personMediaIds(database, id)
        )
      ),
    database.delete(personPositions).where(eq(personPositions.personId, id)),
    database.delete(personContacts).where(eq(personContacts.personId, id)),
    database.delete(personMedia).where(eq(personMedia.personId, id)),
    database
      .delete(personLocalizations)
      .where(eq(personLocalizations.personId, id)),
    database
      .insert(people)
      .values({
        createdAt: timestamp,
        id,
        slug: payload.slug,
        sortOrder: payload.sortOrder,
        status: payload.status,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        set: {
          slug: payload.slug,
          sortOrder: payload.sortOrder,
          status: payload.status,
          updatedAt: timestamp,
        },
        target: people.id,
      }),
    ...payload.localizations.map((localization) =>
      database.insert(personLocalizations).values({
        alternateName: localization.alternateName,
        biographyJson: JSON.stringify(localization.biography),
        displayName: localization.displayName,
        honorific: localization.honorific,
        language: localization.language,
        personId: id,
        seoDescription: localization.seoDescription,
      })
    ),
    ...contacts.map((contact) =>
      database.insert(personContacts).values({
        createdAt: timestamp,
        href: contact.href,
        id: contact.id,
        kind: contact.kind,
        personId: id,
        sortOrder: contact.sortOrder,
        updatedAt: timestamp,
      })
    ),
    ...contacts.flatMap((contact) =>
      contact.localizations.map((localization) =>
        database.insert(personContactLocalizations).values({
          ...localization,
          personContactId: contact.id,
        })
      )
    ),
    ...positions.map((position) =>
      database.insert(personPositions).values({
        communityId: position.communityId,
        createdAt: timestamp,
        endsAt: position.endsAt,
        id: position.id,
        personId: id,
        roleKey: position.roleKey,
        sortOrder: position.sortOrder,
        startsAt: position.startsAt,
        updatedAt: timestamp,
      })
    ),
    ...positions.flatMap((position) =>
      position.localizations.map((localization) =>
        database.insert(personPositionLocalizations).values({
          ...localization,
          positionId: position.id,
        })
      )
    ),
    ...media.map((item) =>
      database.insert(personMedia).values({
        createdAt: timestamp,
        id: item.id,
        mediaId: item.mediaId,
        personId: id,
        role: item.role,
        sortOrder: item.sortOrder,
      })
    ),
    ...media.flatMap((item) =>
      item.localizations.map((localization) =>
        database.insert(personMediaLocalizations).values({
          ...localization,
          personMediaId: item.id,
        })
      )
    ),
  ]);

  return { id };
};

const communityContactIds = (database: StudioDatabase, communityId: string) =>
  database
    .select({ id: communityContacts.id })
    .from(communityContacts)
    .where(eq(communityContacts.communityId, communityId));

const communityServiceIds = (database: StudioDatabase, communityId: string) =>
  database
    .select({ id: communityServices.id })
    .from(communityServices)
    .where(eq(communityServices.communityId, communityId));

const communityMediaIds = (database: StudioDatabase, communityId: string) =>
  database
    .select({ id: communityMedia.id })
    .from(communityMedia)
    .where(eq(communityMedia.communityId, communityId));

export const saveCommunityDirectory = async (input: {
  database: StudioDatabase;
  payload: CommunityEditorInput;
}) => {
  const { database, payload } = input;
  const id = payload.id ?? crypto.randomUUID();
  const timestamp = Date.now();
  const contacts = payload.contacts.map((contact) => ({
    ...contact,
    id: contact.id ?? crypto.randomUUID(),
  }));
  const services = payload.services.map((service) => ({
    ...service,
    id: service.id ?? crypto.randomUUID(),
  }));
  const media = payload.media.map((item) => ({
    ...item,
    id: item.id ?? crypto.randomUUID(),
  }));

  await database.batch([
    database
      .delete(communityContactLocalizations)
      .where(
        inArray(
          communityContactLocalizations.communityContactId,
          communityContactIds(database, id)
        )
      ),
    database
      .delete(communityServiceLocalizations)
      .where(
        inArray(
          communityServiceLocalizations.communityServiceId,
          communityServiceIds(database, id)
        )
      ),
    database
      .delete(communityMediaLocalizations)
      .where(
        inArray(
          communityMediaLocalizations.communityMediaId,
          communityMediaIds(database, id)
        )
      ),
    database
      .delete(communityContacts)
      .where(eq(communityContacts.communityId, id)),
    database
      .delete(communityServices)
      .where(eq(communityServices.communityId, id)),
    database.delete(communityMedia).where(eq(communityMedia.communityId, id)),
    database
      .delete(communityLocalizations)
      .where(eq(communityLocalizations.communityId, id)),
    database
      .insert(communities)
      .values({
        addressLine: payload.addressLine,
        countryCode: payload.countryCode,
        createdAt: timestamp,
        id,
        latitude: payload.latitude,
        locality: payload.locality,
        longitude: payload.longitude,
        operationalStatus: payload.operationalStatus,
        postalCode: payload.postalCode,
        slug: payload.slug,
        sortOrder: payload.sortOrder,
        status: payload.status,
        type: payload.type,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        set: {
          addressLine: payload.addressLine,
          countryCode: payload.countryCode,
          latitude: payload.latitude,
          locality: payload.locality,
          longitude: payload.longitude,
          operationalStatus: payload.operationalStatus,
          postalCode: payload.postalCode,
          slug: payload.slug,
          sortOrder: payload.sortOrder,
          status: payload.status,
          type: payload.type,
          updatedAt: timestamp,
        },
        target: communities.id,
      }),
    ...payload.localizations.map((localization) =>
      database
        .insert(communityLocalizations)
        .values({ ...localization, communityId: id })
    ),
    ...contacts.map((contact) =>
      database.insert(communityContacts).values({
        communityId: id,
        createdAt: timestamp,
        href: contact.href,
        id: contact.id,
        kind: contact.kind,
        sortOrder: contact.sortOrder,
        updatedAt: timestamp,
      })
    ),
    ...contacts.flatMap((contact) =>
      contact.localizations.map((localization) =>
        database.insert(communityContactLocalizations).values({
          ...localization,
          communityContactId: contact.id,
        })
      )
    ),
    ...services.map((service) =>
      database.insert(communityServices).values({
        communityId: id,
        createdAt: timestamp,
        endsAt: service.endsAt,
        id: service.id,
        sortOrder: service.sortOrder,
        startsAt: service.startsAt,
        updatedAt: timestamp,
      })
    ),
    ...services.flatMap((service) =>
      service.localizations.map((localization) =>
        database.insert(communityServiceLocalizations).values({
          ...localization,
          communityServiceId: service.id,
        })
      )
    ),
    ...media.map((item) =>
      database.insert(communityMedia).values({
        communityId: id,
        createdAt: timestamp,
        id: item.id,
        mediaId: item.mediaId,
        role: item.role,
        sortOrder: item.sortOrder,
      })
    ),
    ...media.flatMap((item) =>
      item.localizations.map((localization) =>
        database.insert(communityMediaLocalizations).values({
          ...localization,
          communityMediaId: item.id,
        })
      )
    ),
  ]);

  return { id };
};
