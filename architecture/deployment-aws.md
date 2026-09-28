# AWS demo runtime

The Portal is deployed beside GCS in the sibling repository's `GcsSscDemo`
CDK stack. It has its own Fargate service, PostgreSQL database, authentication
secret, internal load balancer, CloudFront VPC origin, and HTTPS hostname.
The two applications do not share database credentials or sessions.
Uploaded attachments use a separate private S3 bucket with task-role access to
the `portal-attachments/` prefix. Active objects have no expiry; noncurrent
versions expire after 30 days. The container filesystem does not store uploads.

GitHub's manual `publish-demo-images.yml` workflow builds the demo image with
the Canada Central RDS trust bundle. ECS overrides its normal command with
`node .output/aws-start.mjs`. That wrapper assembles `DATABASE_URL` from
Secrets Manager injected credentials and requires full PostgreSQL hostname
verification using the bundled CA, then runs the normal migration, demo seed,
and server startup path. The normal container command remains in use on Railway.

The Portal target group checks `/api/session`. Startup migrations and seeds run
before the server listens, so readiness is not reported during database setup.
The database has seven-day backups, deletion protection, and a final snapshot
policy. Deployments stop the old revision before the new revision starts; schema
migrations are not undone by an ECS rollback.
