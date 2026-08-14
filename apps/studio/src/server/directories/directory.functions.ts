import { env } from "cloudflare:workers";
import {
  communityEditorSchema,
  personEditorSchema,
} from "@ortodoksas-lt/content/directory";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { getDatabase } from "../../../worker/db";
import { requireStudioEditor } from "../auth";
import { requireStudioWritesOpen } from "../write-mode";
import {
  listCommunityDirectory,
  listPeopleDirectory,
} from "./directory.repository";
import {
  saveCommunityDirectory,
  savePersonDirectory,
} from "./directory.service";

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
