import {
  communityEditorSchema,
  personEditorSchema,
} from "@ortodoksas-lt/content/directory";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { requireStudioEditor } from "../auth";
import { getDatabase } from "../db.server";
import { requireStudioWritesOpen } from "../write-mode";
import { searchCommunityAddresses } from "./community-geocoding";
import {
  listCommunityDirectory,
  listPeopleDirectory,
} from "./directory.repository";
import {
  saveCommunityDirectory,
  savePersonDirectory,
} from "./directory.service";

const communityAddressSearchSchema = z.object({
  query: z.string().trim().min(3).max(160),
});

export const loadPeopleDirectory = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireStudioEditor(env);

    return await listPeopleDirectory(getDatabase(env.DB));
  }
);

export const savePersonDirectoryMutation = createServerFn({ method: "POST" })
  .validator(personEditorSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    requireStudioWritesOpen(env);

    return await savePersonDirectory({
      database: getDatabase(env.DB),
      payload: data,
    });
  });

export const loadCommunityDirectory = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireStudioEditor(env);

    return await listCommunityDirectory(getDatabase(env.DB));
  }
);

export const saveCommunityDirectoryMutation = createServerFn({ method: "POST" })
  .validator(communityEditorSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    requireStudioWritesOpen(env);

    return await saveCommunityDirectory({
      database: getDatabase(env.DB),
      payload: data,
    });
  });

export const searchCommunityAddressesQuery = createServerFn({ method: "GET" })
  .validator(communityAddressSearchSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);

    return await searchCommunityAddresses(data.query);
  });

export const peopleDirectoryQueryOptions = () =>
  queryOptions({
    queryFn: async () => await loadPeopleDirectory(),
    queryKey: ["studio", "people-directory"] as const,
  });

export const communityDirectoryQueryOptions = () =>
  queryOptions({
    queryFn: async () => await loadCommunityDirectory(),
    queryKey: ["studio", "community-directory"] as const,
  });
