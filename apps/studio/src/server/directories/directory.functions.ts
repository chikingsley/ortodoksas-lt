import { env } from "cloudflare:workers";
import {
  communityEditorSchema,
  personEditorSchema,
} from "@ortodoksas-lt/content/directory";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getDatabase } from "../../../worker/db";
import { requireStudioEditor } from "../auth";
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
    return listPeopleDirectory(getDatabase(env.DB));
  }
);

export const savePersonDirectoryMutation = createServerFn({ method: "POST" })
  .validator((input: unknown) => personEditorSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    requireStudioWritesOpen(env);
    return savePersonDirectory({
      database: getDatabase(env.DB),
      payload: data,
    });
  });

export const loadCommunityDirectory = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireStudioEditor(env);
    return listCommunityDirectory(getDatabase(env.DB));
  }
);

export const saveCommunityDirectoryMutation = createServerFn({ method: "POST" })
  .validator((input: unknown) => communityEditorSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    requireStudioWritesOpen(env);
    return saveCommunityDirectory({
      database: getDatabase(env.DB),
      payload: data,
    });
  });

export const searchCommunityAddressesQuery = createServerFn({ method: "GET" })
  .validator((input: unknown) => communityAddressSearchSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    return searchCommunityAddresses(data.query);
  });

export const peopleDirectoryQueryOptions = () =>
  queryOptions({
    queryFn: () => loadPeopleDirectory(),
    queryKey: ["studio", "people-directory"] as const,
  });

export const communityDirectoryQueryOptions = () =>
  queryOptions({
    queryFn: () => loadCommunityDirectory(),
    queryKey: ["studio", "community-directory"] as const,
  });
