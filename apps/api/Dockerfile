
# Stage 1: Builder
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json package-lock.json ./
COPY nx.json tsconfig.base.json ./

RUN npm ci --ignore-scripts

COPY . .

RUN npx nx build api --configuration=production

FROM node:20-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache vips

ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/api ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

RUN npm ci --omit=dev --ignore-scripts

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
