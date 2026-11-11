FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

USER node
EXPOSE 3000

# 메모리 512MB 조건: Node 힙 상한 제한
CMD ["node", "--max-old-space-size=192", "src/server.js"]
