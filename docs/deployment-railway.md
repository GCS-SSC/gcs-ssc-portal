# GitHub images and Railway

The private portal repository builds one GHCR package whose demo image is public:

- `ghcr.io/gcs-ssc/gcs-ssc-portal-demo-gcdesign`

The [publish workflow](../.github/workflows/publish-demo-images.yml) runs only when manually dispatched from GitHub Actions. Pushing to `main` does not build or publish an image. The workflow builds the selected commit once for `linux/amd64`, tests that exact image with isolated PostgreSQL, then pushes it and uploads an `image-gcdesign` artifact containing its digest and source commit. Its smoke test checks database migrations, owner/administrator sign-in and preservation of edited data after container restart. GitHub uses its scoped `GITHUB_TOKEN` (`packages:write`); no Railway token is needed and the workflow never deploys to Railway. Set the package visibility to Public in GitHub package settings before deployment.

## Promote a verified release

Run **Build and publish portal demo image** from the repository's GitHub Actions page when an image release is needed. Select the source branch, then wait for the publish job to succeed:

```sh
gh run list --workflow publish-demo-images.yml
gh run download <successful-run-id> --pattern 'image-*' --dir .agent/image-release
bun scripts/promote-images.ts .agent/image-release
# Review and commit deployment/demo-images.json, then push main.
```

Use a fresh download directory for each release. The promotion script validates the source commit, exact GC Design System package name, and SHA-256 digest. Mutable tags and source-build fallback are rejected. A pin-only commit does not rebuild images. Committing a pin does not apply Railway configuration.

## Shared GCS Demo Railway deployment

1. Install the Railway CLI and link the sibling `gcs-ssc` checkout to the existing `GCS Demo` project and `demo` environment. Its `.railway/railway.ts` is the authoritative graph for all three groups: Metabase, GCS, and Portal, each with its own PostgreSQL service.
2. In that environment, create a sealed shared variable `PORTAL_AUTH_SECRET` using a fresh random value of at least 32 characters (`openssl rand -base64 32`). The shared graph references this as the Portal's `BETTER_AUTH_SECRET`.
3. Download the successful image artifact and pin its immutable digest in the sibling checkout's `deployment/portal-demo-image.json`. Make the GHCR package public in GitHub package settings and verify an anonymous pull.
4. Run `railway config plan` from the sibling `gcs-ssc` checkout. Review the preservation of existing Metabase and GCS services, then run `railway config apply`.
5. Generate a public Railway domain for `gcs-ssc-portal` on port 3000. The image derives its canonical HTTPS `APP_URL` from `RAILWAY_PUBLIC_DOMAIN`; before the domain exists, startup fails for lack of a canonical origin. Generate the domain and redeploy after first bootstrap. For a custom domain, set the exact HTTPS `APP_URL` instead. Never use a wildcard trusted origin.
6. Check deployment health at `/api/session`, which becomes reachable only after startup migrations and seeding succeed. Sign in with the [README demo accounts](../README.md#demo-seed-data). System administrators use `/admin/login`; organization accounts use `/login`.

The sibling graph is tested for project/environment scope, digest-only sources, PostgreSQL references and secret references. This repository's previous standalone Portal graph is obsolete and must not be applied.

## Seed and persistence

Demo is an explicit **image build mode** (`PORTAL_ENVIRONMENT=demo`). Its entrypoint validates configuration, runs normal schema migrations, applies the separately tracked demo data migrations, closes the migration connection, then starts Nitro. No HTTP traffic is accepted during initialization. All restarts and deployments reuse PostgreSQL data; the seed is a no-op after its first successful run. Multiple replicas coordinate through Kysely's migration locks, though this IaC currently requests one replica.

The five published demo passwords are intentionally known test credentials. Use a dedicated demo database without real user data. A first seed refuses an colliding demo email and rolls back rather than replacing accounts. Do not reuse an existing production database or remove seed history to reset it. There is no destructive reset workflow.

Build a production image with `--build-arg PORTAL_ENVIRONMENT=production` when demo access is no longer wanted. It excludes the seed bundle. Changing the runtime environment cannot turn a production image into a demo image or vice versa; startup rejects a mode mismatch. Switching images does not delete existing demo accounts—use a clean production database and the documented administrator provisioning procedure. Keep normal secrets and HTTPS configuration in production as well.

## Attachments

Files use the app-wide storage configuration described in [attachments](../architecture/attachments.md). Without S3, uploads use `ATTACHMENT_LOCAL_DIR` (default `.data/attachments`). Railway containers have ephemeral filesystems, so production attachments require a persistent volume mounted at an absolute `ATTACHMENT_LOCAL_DIR`, or a private S3-compatible bucket. The sample form has attachments disabled. To use S3, set `S3_BUCKET`, `S3_REGION`, optional `S3_ENDPOINT`/`S3_FORCE_PATH_STYLE` and standard AWS credentials as service variables, then enable attachments on a new survey revision. Back up PostgreSQL and attachment storage together. Bucket and volume provisioning are not performed by this graph.

## Local image verification

```sh
docker build --build-arg PORTAL_ENVIRONMENT=demo -t portal-demo:gcdesign .
bash scripts/test-container-image.sh portal-demo:gcdesign
```

The smoke script owns a unique local Docker network, PostgreSQL container and app container and removes only those resources afterward. It never contacts Railway or the configured application database.

The implementation follows Railway's [IaC reference](https://docs.railway.com/infrastructure-as-code/reference), using the same pinned-image approach as the sibling repository. Runtime secrets and generated domains remain outside authored source.
