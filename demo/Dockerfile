# Build context: the nestjs-apcore/ root (one level up from this file).
# Usage:
#   docker compose up --build          (from demo/)
#   docker build -t nestjs-apcore-demo -f demo/Dockerfile ..  (from nestjs-apcore/)

FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace/nestjs-apcore

# ---- Build nestjs-apcore library ----
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY src/ ./src/
COPY tsconfig*.json ./
RUN pnpm run build

# ---- Install demo dependencies ----
COPY demo/package.json demo/pnpm-lock.yaml ./demo/
WORKDIR /workspace/nestjs-apcore/demo
RUN pnpm install --frozen-lockfile

# ---- Copy demo source ----
COPY demo/src/ ./src/
COPY demo/tsconfig.json ./

EXPOSE 3000 8000

CMD ["pnpm", "exec", "tsx", "src/main.ts"]
