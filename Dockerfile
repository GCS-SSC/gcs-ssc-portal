FROM oven/bun:1.3.13 AS build
WORKDIR /app
ARG PORTAL_ENVIRONMENT=demo
RUN case "$PORTAL_ENVIRONMENT" in demo|production) ;; *) exit 1 ;; esac
RUN apt-get update && apt-get install --no-install-recommends -y ca-certificates git && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
COPY vendor/survey ./vendor/survey
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run postinstall && bun run build
RUN bun build scripts/migrate.ts --target=node --packages=external --outfile=.output/server/migrate.mjs \
 && if [ "$PORTAL_ENVIRONMENT" = demo ]; then bun build scripts/seed-demo.ts --target=node --packages=external --outfile=.output/server/seed-demo.mjs; fi \
 && printf '%s' "$PORTAL_ENVIRONMENT" > .output/environment \
 && cp deployment/start.mjs .output/start.mjs

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
RUN node -e 'const fs = require("node:fs"); const path = "/app/.output/server/package.json"; const manifest = JSON.parse(fs.readFileSync(path, "utf8")); for (const name of Object.keys(manifest.dependencies)) if (name === "@gcs-ssc/survey" || name.endsWith("-linux-x64-musl")) delete manifest.dependencies[name]; fs.writeFileSync(path, JSON.stringify(manifest));' \
 && npm install --omit=dev --ignore-scripts --legacy-peer-deps --no-audit --no-fund --prefix /app/.output/server \
 && chown -R node:node /app/.output \
 && mkdir -p /app/.data/pglite && chown -R node:node /app/.data
COPY --from=build --chown=node:node /app/vendor/survey /app/.output/server/node_modules/@gcs-ssc/survey
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PGLITE_DATA_DIR=/app/.data/pglite
USER node
EXPOSE 3000
CMD ["node", ".output/start.mjs"]
