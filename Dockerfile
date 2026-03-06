FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS builder

COPY . .
ENV SKIP_ENV_VALIDATION=1
RUN bun run build

FROM deps AS migrator
COPY . .

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

RUN chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 3000
CMD ["bun", "server.js"]
