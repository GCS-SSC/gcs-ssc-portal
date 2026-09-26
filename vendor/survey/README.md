# Survey provider build

This directory contains the compiled `@gcs-ssc/survey` provider used by the portal. Its source lives in the sibling `gcs-ssc-survey` repository. It is kept here so production installs of the portal do not require a sibling checkout while the schema version 3 changes are awaiting a pinned survey release.

After changing the provider source, run `bun run build` in `gcs-ssc-survey`, copy its `dist/` directory here, and run the portal checks. Replace this vendored build with a pinned Git release once schema version 3 is published.
