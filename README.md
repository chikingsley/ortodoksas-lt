# ortodoksas.lt

Source code for the `ortodoksas.lt` public publication and its staff Editorial
Studio.

- Public Worker: <https://ortodoksas.grassinside.com>
- Editorial Studio: <https://ortodoksas-studio.grassinside.com>
- Source repository: <https://github.com/chikingsley/ortodoksas-lt>
- Target canonical domain: <https://ortodoksas.lt>

The canonical domain becomes active when its DNS records move to the Cloudflare
Worker. The two `grassinside.com` addresses provide the current deployed
application during that cutover.

## Architecture

```text
Editors -> Clerk -> Studio Worker -> shared D1 + R2
                                      ^
Visitors -> Public Astro Worker ------+
```

The public site and Studio are separate Cloudflare Workers. They share one D1
database and one R2 media bucket:

- D1 stores articles, translations, people, communities, homepage placements,
  editorial baselines, and revision history.
- R2 stores immutable original media objects.
- The public Worker reads published D1 records and delivers R2-backed media.
- The Studio Worker authenticates staff with Clerk and writes editorial changes
  to the same D1 and R2 resources.
- Cloudflare Images provides responsive image transformations in Studio media
  delivery.

API routes stay under `/api` and run through each Worker before the static-asset
fallback.

## Workspace organization

| Path | Responsibility |
| --- | --- |
| `apps/web` | Astro public publication and Cloudflare Worker delivery layer |
| `apps/studio` | TanStack Start editorial application and authenticated Worker |
| `packages/content` | Shared article, translation, directory, and site contracts |
| `packages/editor` | Shared Tiptap schema, rendering, provenance, and quality gates |
| `packages/db` | Drizzle schema and ordered D1 SQL migrations |
| `assets/brand` | Official identity files plus documented brand research |
| `docs/web` | Public-site architecture and translation decisions |

The main runtime paths are:

```text
Public request
  -> Astro route
  -> apps/web/src/server
  -> D1 / R2
  -> Astro components with focused React islands

Studio request
  -> Clerk authentication and Organization authorization
  -> TanStack Start route or server function
  -> apps/studio/worker/services
  -> D1 / R2
```

Copied shadcn components backed by Base UI live in each app's
`src/components/ui` directory. Studio feature composition lives under
`apps/studio/src/editorial`. The official Tiptap editor kit lives under
`apps/studio/src/components/tiptap-*`; the shared document contract and static
renderer live in `packages/editor`.

## Prerequisites

- Git
- Node.js 24
- pnpm 11.20.0, pinned by the root `packageManager` field
- A Cloudflare account with Workers, D1, R2, and Images access
- A Clerk production application with Organizations enabled
- A Cloudflare-managed zone for custom production domains
- A private D1 export and R2 object copy when reproducing the current production
  corpus in another account

## Install

```sh
git clone https://github.com/chikingsley/ortodoksas-lt.git
cd ortodoksas-lt
corepack enable
pnpm install --frozen-lockfile
```

## Local configuration

Create `apps/studio/.dev.vars` with development-instance Clerk values:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=replace-with-development-publishable-key
CLERK_SECRET_KEY=replace-with-development-secret-key
CLERK_ORGANIZATION_ID=replace-with-organization-id
```

These files are ignored by Git. Keep every secret in local environment files or
Wrangler's encrypted secret store.

Apply the D1 migrations to Studio's local binding store:

```sh
pnpm --dir apps/studio run db:migrate:local
```

Start the applications in separate terminals:

```sh
pnpm dev:web
pnpm dev:studio
```

Local Cloudflare development uses local D1 and R2 binding storage. The deployed
Workers provide the shared production database and media bucket.

## Quality and release gate

Run the complete repository gate from the workspace root:

```sh
pnpm check
```

This command runs Ultracite/Biome formatting and linting, TypeScript checks,
React and shared-package Vitest suites, Worker-runtime tests through
Cloudflare's Vitest pool, production builds, and Wrangler dry runs.

Useful focused commands:

```sh
pnpm build
pnpm --filter @ortodoksas-lt/web run test:worker
pnpm --filter @ortodoksas-lt/studio run test
pnpm --filter @ortodoksas-lt/web run cf:types
pnpm --filter @ortodoksas-lt/studio run cf-typegen
```

Regenerate Wrangler binding types after every binding or configuration change.

## Deploy the existing production installation

This path uses the existing Cloudflare account, Workers, shared D1 database, R2
bucket, routes, and Clerk application.

Authenticate Wrangler and verify the selected account:

```sh
cd apps/studio
pnpm exec wrangler login
pnpm exec wrangler whoami
pnpm exec wrangler secret list
cd ../..
```

Create `apps/studio/.env.production.local` for the Vite client build input:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=replace-with-production-publishable-key
```

Wrangler stores the Studio's server-side production values:

```sh
cd apps/studio
pnpm exec wrangler secret put CLERK_SECRET_KEY
pnpm exec wrangler secret put CLERK_ORGANIZATION_ID
pnpm exec wrangler secret put VITE_CLERK_PUBLISHABLE_KEY
cd ../..
```

Apply pending migrations once through the Studio binding, then deploy both
Workers:

```sh
pnpm --dir apps/studio exec wrangler d1 migrations apply DB --remote
pnpm check
pnpm --filter @ortodoksas-lt/studio run deploy
pnpm --filter @ortodoksas-lt/web run deploy
```

The tracked Wrangler configurations use ID-free bindings. Cloudflare preserves
the D1 and R2 resources already linked to each existing Worker across subsequent
deployments.

## Deploy into a clean Cloudflare account

A clean installation needs one shared D1 database and one shared R2 bucket.
Both Workers must receive the same resource bindings.

### 1. Configure domains and application origins

Update these deployment-specific values:

- `apps/web/wrangler.jsonc`: Worker name and public custom-domain routes
- `apps/studio/wrangler.jsonc`: Worker name, Studio custom domain,
  `CLERK_AUTHORIZED_PARTIES`, and `PUBLICATION_ORIGIN`
- `apps/web/src/site.ts`: canonical public origin and publication metadata
- `apps/web/vite.config.ts` and `apps/studio/vite.config.ts`: development host
  allowlists when the deployment uses different preview hosts

The repository is product-specific to `ortodoksas.lt`. A separately branded
publication also needs updated copy, metadata, social links, and brand assets.

### 2. Create the shared storage resources

From `apps/studio`, authenticate and create one database and one bucket:

```sh
cd apps/studio
pnpm exec wrangler login
pnpm exec wrangler d1 create <database-name>
pnpm exec wrangler r2 bucket create <bucket-name>
```

Wrangler prints the D1 database name and ID. Add the same D1 binding details and
the same R2 bucket name to both `apps/studio/wrangler.jsonc` and
`apps/web/wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "<database-name>",
      "database_id": "<database-id>",
      "migrations_dir": "../../packages/db/migrations"
    }
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "<bucket-name>"
    }
  ]
}
```

Cloudflare's automatic provisioning is Worker-specific. Explicit shared
bindings ensure that Studio writes become visible to the public Worker in a new
account. Binding IDs identify Cloudflare resources; Clerk keys and R2 API
credentials remain encrypted secrets.

The public template keeps account-specific IDs out of source. A client-owned
deployment fork or private deployment configuration can retain its own binding
identifiers.

### 3. Configure Clerk

In Clerk:

1. Create or select the production application.
2. Enable Organizations.
3. Create one Organization for the editorial team.
4. Add the first operator with the `org:admin` role.
5. Copy the production publishable key, secret key, and Organization ID into
   the local build environment and Wrangler secret store described above.
6. Add the Studio origin to Clerk's production domain and redirect settings.

Studio maps Clerk's default roles as follows:

- `org:admin` — full Studio access plus invitations and role management
- `org:member` — editorial access

After the first administrator signs in, the Studio **Team** screen manages
invitations, membership, and roles.

### 4. Initialize or restore D1

For an empty publication, apply the full ordered migration history:

```sh
pnpm --dir apps/studio exec wrangler d1 migrations apply DB --remote
```

For an exact production copy, import the privately transferred D1 SQL export
into the new blank database, then apply migrations created after that export:

```sh
pnpm --dir apps/studio exec wrangler d1 execute DB --remote --file=/secure/path/database.sql
pnpm --dir apps/studio exec wrangler d1 migrations apply DB --remote
```

Restore the matching R2 objects through Cloudflare's S3-compatible API with a
tool such as `rclone`. Preserve every object key because D1 media records point
to those stable keys.

The source repository contains application code, migrations, tests, and brand
assets. The current article corpus and editorial history live in D1, media
objects live in R2, and team membership lives in Clerk. Transfer production
backups and account ownership privately.

### 5. Deploy and verify

```sh
pnpm check
pnpm --filter @ortodoksas-lt/studio run deploy
pnpm --filter @ortodoksas-lt/web run deploy
```

Complete the browser verification checklist below before moving canonical DNS.

## Browser verification checklist

Verify the rendered applications rather than relying only on build output:

1. Open the public homepage and confirm that published stories and images
   render.
2. Click each language option and confirm that the URL and visible title/body
   remain in the chosen locale.
3. Open one article, one person page, and one community page.
4. Open `/api/health` on the public Worker.
5. Open the Studio `/articles` route and confirm that a signed-out visitor
   reaches Clerk sign-in.
6. Sign in as `org:admin`, open **Team**, and confirm invitation controls.
7. Save a draft, upload media, preview the article, and publish it.
8. Confirm that the public Worker renders the newly published record and media.

A successful build proves compilation. The checklist proves routing,
authentication, shared storage, publication, locale state, and rendered output.

## Backup and handoff

Create a D1 export before a platform transfer or major migration:

```sh
pnpm --dir apps/studio exec wrangler d1 export DB --remote --output=/secure/path/database.sql
```

Copy the R2 bucket through its S3-compatible API and compare the source and
destination object counts. Store D1 exports, R2 credentials, Clerk keys, and
Cloudflare API tokens in the receiving organization's secure credential and
backup systems.

A complete operational handoff includes:

- GitHub repository ownership or collaborator access
- Cloudflare account and zone access
- Both Worker projects and their custom domains
- Shared D1 and R2 ownership
- Clerk production application and Organization administration
- At least two `org:admin` members
- A recent private D1 export and R2 copy
- DNS registrar access for the canonical domain

## Security boundaries

- `.dev.vars`, `.env*`, local Wrangler state, and build output are ignored by
  Git.
- Production Clerk values live in Wrangler's encrypted secret store.
- The Clerk publishable key is public browser configuration; the Clerk secret
  key remains server-side.
- D1 exports and R2 mirrors stay outside the public repository.
- Enable GitHub Secret Protection and push protection as an additional
  repository gate for future pushes.
- Review `git status`, `git diff --check`, and the complete `pnpm check` result
  before every release.

## Historical source archive

The historical crawl and migration evidence lives in the public
[`chikingsley/ortodoksas-lt-source-archive`](https://huggingface.co/datasets/chikingsley/ortodoksas-lt-source-archive)
dataset. It preserves source provenance and migration evidence. Operational D1
exports and R2 backups provide the exact current production state.

## Further documentation

- [`PRODUCT.md`](./PRODUCT.md) — public product scope
- [`DESIGN.md`](./DESIGN.md) — public-site design system
- [`COMPONENT-ARCHITECTURE.md`](./COMPONENT-ARCHITECTURE.md) — component boundaries
- [`apps/studio/README.md`](./apps/studio/README.md) — Studio internals and commands
- [`apps/studio/PRODUCT.md`](./apps/studio/PRODUCT.md) — editorial workflows
- [`apps/studio/EDITORIAL_STANDARDS.md`](./apps/studio/EDITORIAL_STANDARDS.md) — publication standards
- [`docs/web/DECISIONS.md`](./docs/web/DECISIONS.md) — public architecture decisions
- [`docs/web/TRANSLATION.md`](./docs/web/TRANSLATION.md) — locale and translation contract

## Platform references

- [Cloudflare Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare D1 import and export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [Cloudflare R2 with rclone](https://developers.cloudflare.com/r2/examples/rclone/)
- [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production)
- [Clerk Organizations](https://clerk.com/docs/guides/organizations/overview)
- [Clerk Organization invitations](https://clerk.com/docs/guides/organizations/add-members/invitations)
