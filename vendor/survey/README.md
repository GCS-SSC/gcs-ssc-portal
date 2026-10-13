# Survey provider build

This directory contains the compiled `@gcs-ssc/survey` provider shared by the connector and the sibling Portal. Its source lives in the separately maintained `GCS-SSC/survey` repository. The build supports form schema versions 1–5, including designer answer rules in version 5. Archived and published definitions retain their original version.

After provider changes, run its tests, typecheck and build, copy the generated `dist/` into both applications, refresh their installed local package, and run each owning application’s checks. Keep both applications on the same provider build.
