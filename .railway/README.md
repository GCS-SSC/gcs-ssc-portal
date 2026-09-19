# Portal Railway IaC

This is a **new, separate** `GCS Portal Demo` project and `demo` environment, not the sibling application's existing project. The authoring file rejects other project/environment names.

It declares PostgreSQL and one `gcs-ssc-portal` instance using the digest selected in `deployment/demo-images.json`. Image auto-updates are disabled. There is no source-build fallback, source deployment trigger, app PGlite volume, reset job or automatic Railway apply workflow.

Follow [the deployment runbook](../docs/deployment-railway.md). The project/environment, shared auth secret, GHCR pull credentials and generated domain are operator setup steps when deployment is authorized. No Railway resources have been created by preparing these files.

The pinned `railway` SDK is a development dependency. Install Railway CLI 5.54.1 or newer separately. Once the correct project/environment exists and is linked, supply registry credentials in your terminal environment and run `railway config plan`. Review its changes before running `railway config apply`. Plans can contain registry credentials: keep plan files private and outside version control. Do not apply this graph to an existing unrelated project; omitted resources can become deletion candidates.
