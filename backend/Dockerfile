# syntax=docker/dockerfile:1.7
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM node:26-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY migrations ./migrations
# The official image ships an unprivileged "node" user (uid 1000).
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "src/server.js"]
