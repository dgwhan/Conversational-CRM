# Multi-stage Dockerfile for NestJS API in pnpm workspace
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat openssl python3 make g++
RUN npm install -g pnpm@9
WORKDIR /app

# Stage 1: Build application
FROM base AS builder
WORKDIR /app
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placeholder?schema=public"

# Copy pnpm workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies including devDependencies needed to build
RUN pnpm install --frozen-lockfile

# Copy API source code
COPY apps/api ./apps/api

# Generate Prisma Client and build NestJS API
RUN pnpm --filter api build

# Stage 2: Lightweight runner image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl

# Switch to built-in non-root user
USER node

# Copy built workspace from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api
EXPOSE 3000

# /api/health trả 503 khi Postgres/Redis không phản hồi (busybox wget có sẵn trong alpine)
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Áp migration trước khi khởi động. Prisma dùng advisory lock nên nhiều instance khởi động cùng lúc vẫn an toàn.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
