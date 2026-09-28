# Portal Railway deployment

The Portal runs in the existing `GCS Demo` Railway project and `demo` environment, alongside GCS and Metabase. The sibling `gcs-ssc` repository owns the shared `.railway/railway.ts` graph. It provisions the Portal service and a dedicated PostgreSQL service in the Portal canvas group. The old standalone Portal graph has been removed so it cannot accidentally create or reconcile a separate project.

Build and verify a Portal demo image using `.github/workflows/publish-demo-images.yml`, then promote its immutable digest to `deployment/demo-images.json` here and `deployment/portal-demo-image.json` in the sibling repository. Make the GHCR package public in GitHub package settings before applying the shared graph. See [the runbook](../docs/deployment-railway.md).
