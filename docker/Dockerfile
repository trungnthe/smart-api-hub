FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Cài đặt toàn bộ bao gồm cả devDeps để build
RUN npm ci

COPY . .
# Tạo schema, generate client và build source code
RUN npx ts-node src/data/schemaGenenerator.ts
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Chỉ cài production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy thư mục dist đã build hoàn chỉnh
COPY --from=builder /app/dist ./dist
# Copy thư mục prisma (chứa schema.prisma và seed.ts)
COPY --from=builder /app/prisma ./prisma
# Copy file config/schema cần thiết cho seed/runtime
COPY --from=builder /app/schema.json ./schema.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Generate Prisma Client ở môi trường production (vì nó nằm trong node_modules)
RUN npx prisma generate

EXPOSE 3000

# Thứ tự: Đẩy schema -> Đổ data -> Chạy app
CMD npx prisma db push && npx prisma db seed && node dist/src/server.js