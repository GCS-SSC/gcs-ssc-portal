FROM oven/bun:1.3.13 AS build
WORKDIR /app
ARG PORTAL_ENVIRONMENT=demo
ARG AWS_RDS_CA_BUNDLE=false
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
 && cp deployment/start.mjs .output/start.mjs \
 && cp deployment/aws-start.mjs .output/aws-start.mjs \
 && if [ "$AWS_RDS_CA_BUNDLE" = "true" ]; then \
      bun -e 'const r = await fetch("https://truststore.pki.rds.amazonaws.com/ca-central-1/ca-central-1-bundle.pem"); if (!r.ok) throw new Error("RDS CA download failed"); const pem = await r.text(); if (!pem.includes("-----BEGIN CERTIFICATE-----")) throw new Error("Invalid RDS CA bundle"); await Bun.write(".output/rds-ca.pem", pem)'; \
    fi

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/node_modules ./node_modules
RUN cp -a /app/.output/server/node_modules/.nitro /app/node_modules/.nitro \
 && rm -rf /app/.output/server/node_modules \
 && ln -s /app/node_modules /app/.output/server/node_modules \
 && rm -rf /app/node_modules/@gcs-ssc/survey \
 && mkdir -p /app/.data/pglite && chown -R node:node /app/.data
COPY --from=build --chown=node:node /app/vendor/survey /app/node_modules/@gcs-ssc/survey
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PGLITE_DATA_DIR=/app/.data/pglite
USER node
EXPOSE 3000
CMD ["node", ".output/start.mjs"]
