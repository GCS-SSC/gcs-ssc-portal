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
RUN mkdir -p /app/runtime-extra/h3 && cp -aL /app/node_modules/h3/. /app/runtime-extra/h3/

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/node_modules ./node_modules
RUN node -e 'const fs = require("node:fs"); const path = require("node:path"); const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) if (entry.isDirectory()) walk(path.join(dir, entry.name)); if (fs.readdirSync(dir).join() === "package.json") fs.rmSync(dir, { recursive: true }); }; walk("/app/.output/server/node_modules");' \
 && mkdir -p /app/.data/pglite && chown -R node:node /app/.data
COPY --from=build --chown=node:node /app/runtime-extra/h3 /app/.output/server/node_modules/h3
COPY --from=build --chown=node:node /app/vendor/survey /app/.output/server/node_modules/@gcs-ssc/survey
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PGLITE_DATA_DIR=/app/.data/pglite
USER node
EXPOSE 3000
CMD ["node", ".output/start.mjs"]
