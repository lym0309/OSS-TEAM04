FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

USER node
EXPOSE 3000

# 1) DB 마이그레이션 (실패하면 서버를 띄우지 않음) → 2) 서버 시작
# 메모리 512MB 조건: Node 힙 상한 제한
CMD ["sh", "-c", "node src/db/migrate.js && exec node --max-old-space-size=192 src/server.js"]
