FROM oven/bun:1.4.3 AS bun
FROM node:22-bookworm-slim AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY Frontend-nident/package.json Frontend-nident/bun.lock ./
RUN bun install --frozen-lockfile
COPY Frontend-nident/ ./
ARG PUBLIC_SITE_URL=http://localhost:8080
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
RUN bun run check && bun run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
