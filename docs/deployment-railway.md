# GitHub images and Railway

The private portal repository builds two private GHCR packages:

- `ghcr.io/gcs-ssc/gcs-ssc-portal-demo-nuxtui`
- `ghcr.io/gcs-ssc/gcs-ssc-portal-demo-gcdesign`

The [publish workflow](../.github/workflows/publish-demo-images.yml) runs on relevant `main` changes or manual dispatch. It builds each image once for `linux/amd64`, tests that exact image with isolated PostgreSQL, then pushes it and uploads an `image-<theme>` artifact containing its digest and source commit. Its smoke test checks database migrations, owner/root sign-in and preservation of edited data after container restart. GitHub uses its scoped `GITHUB_TOKEN` (`packages:write`); no Railway token is needed and the workflow never deploys to Railway. Package visibility is not changed to public.

## Promote a verified release

After both jobs succeed:

```sh
gh run list --workflow publish-demo-images.yml
gh run download <successful-run-id> --pattern 'image-*' --dir .agent/image-release
bun scripts/promote-images.ts .agent/image-release nuxtui
# Review and commit deployment/demo-images.json, then push main.
```

Use a fresh download directory for each release. The promotion script requires artifacts from the same commit and validates both exact package names and SHA-256 digests. The selected theme is a build artifact, not a runtime UI option. Select `gcdesign` to use its image. Null pins prevent planning; mutable tags and source-build fallback are rejected. A pin-only commit does not rebuild images. Committing a pin does not apply Railway configuration.

## First Railway deployment — when authorized

1. Create a **separate** project named `GCS Portal Demo` and an environment named `demo`. Do not reuse `GCS Demo`, which belongs to the sibling app. Install the Railway CLI and link this checkout to the new project/environment. Install repository dependencies with `bun install --frozen-lockfile`.
2. In that environment, create a sealed shared variable `PORTAL_AUTH_SECRET` using a fresh random value of at least 32 characters (`openssl rand -base64 32`). IaC references this as the app's `BETTER_AUTH_SECRET`; it contains no auth secret in source.
3. Ensure the GitHub principal used for pulls can read both private GHCR packages. Create a GitHub token with `read:packages` (and authorize organization SSO where required). Supply `PORTAL_GHCR_USERNAME` and `PORTAL_GHCR_TOKEN` securely in the terminal used for planning/applying. The IaC graph sends these as Railway registry credentials, not application environment variables. Never commit them, print a values-expanded plan, or commit saved plan artifacts. Private-registry access must be available on the selected Railway plan.
4. Run `railway config plan` from this checkout. Expect only the portal service and managed PostgreSQL in the new environment. Review the plan, then run `railway config apply` yourself when ready. This step provisions/deploys; it has **not** been run during preparation.
5. Generate a public Railway domain for `gcs-ssc-portal` on port 3000. The image derives its canonical HTTPS `APP_URL` from `RAILWAY_PUBLIC_DOMAIN`; before the domain exists, startup correctly fails for lack of a canonical origin. Generate the domain and redeploy after this first bootstrap. For a custom domain, set the exact HTTPS `APP_URL` instead. Never use a wildcard trusted origin.
6. Check deployment health at `/api/session`, which becomes reachable only after startup migrations and seeding succeed. Sign in with the [README demo accounts](../README.md#demo-seed-data). Root/staff use `/government/login`; organization accounts use `/login`.

The SDK version is pinned in `package.json`/`bun.lock`. The IaC graph is tested locally for project/environment scope, digest-only sources, PostgreSQL references and secret references. An actual remote plan additionally requires a linked Railway environment and registry credentials; local graph validation does not claim a remote plan or deployment succeeded.

## Seed and persistence

Demo is an explicit **image build mode** (`PORTAL_ENVIRONMENT=demo`). Its entrypoint validates configuration, runs normal schema migrations, applies the separately tracked demo data migrations, closes the migration connection, then starts Nitro. No HTTP traffic is accepted during initialization. All restarts and deployments reuse PostgreSQL data; the seed is a no-op after its first successful run. Multiple replicas coordinate through Kysely's migration locks, though this IaC currently requests one replica.

The six published demo passwords are intentionally known test credentials. Use a dedicated demo database without real user data. A first seed refuses an existing root or colliding demo email and rolls back rather than replacing accounts. Do not reuse an existing production database or remove seed history to reset it. There is no destructive reset workflow.

Build a production image with `--build-arg PORTAL_ENVIRONMENT=production` when demo access is no longer wanted. It excludes the seed bundle. Changing the runtime environment cannot turn a production image into a demo image or vice versa; startup rejects a mode mismatch. Switching images does not delete existing demo accounts—use a clean production database and the documented root bootstrap procedure. Keep normal secrets and HTTPS configuration in production as well.

## Attachments

Files use the app-wide private S3 configuration described in [attachments](../architecture/attachments.md). PostgreSQL stores metadata; the image has no local-file attachment backend. The sample form has attachments disabled and is immediately usable without a bucket. To test files, provision a private S3-compatible bucket, set `S3_BUCKET`, `S3_REGION`, optional `S3_ENDPOINT`/`S3_FORCE_PATH_STYLE` and standard AWS credentials as Railway service variables, then enable attachments on a new survey revision. Back up PostgreSQL and the bucket together. Bucket provisioning is not performed by this graph.

## Local image verification

```sh
docker build --build-arg PORTAL_THEME=nuxtui --build-arg PORTAL_ENVIRONMENT=demo -t portal-demo:nuxtui .
bash scripts/test-container-image.sh portal-demo:nuxtui
```

Repeat with `gcdesign` for its build. The smoke script owns a unique local Docker network, PostgreSQL container and app container and removes only those resources afterward. It never contacts Railway or the configured application database.

The implementation follows Railway's [IaC reference](https://docs.railway.com/infrastructure-as-code/reference), using the same pinned-image approach as the sibling repository. Runtime secrets and generated domains remain outside authored source.

Preparation validation: local container smoke checks exercise the actual Node runtime and database startup. `railway config plan` was attempted without applying; it reported no linked project. No project was linked or created to bypass that prerequisite.
