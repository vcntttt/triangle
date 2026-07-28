FROM oven/bun:1.3.14 AS base

WORKDIR /app

FROM base AS deps

ENV HUSKY=0

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

FROM base AS builder

ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=${VITE_CONVEX_URL}
ARG VITE_CONVEX_SITE_URL
ENV VITE_CONVEX_SITE_URL=${VITE_CONVEX_SITE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

FROM base AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY package.json ./

EXPOSE 3000

CMD ["bun", "run", "start:docker"]
