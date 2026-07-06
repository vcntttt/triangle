FROM node:20-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

FROM base AS deps

ENV HUSKY=0

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM base AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY package.json ./

EXPOSE 3000

CMD ["pnpm", "start:docker"]
