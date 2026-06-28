FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY lib ./lib
COPY packs ./packs
COPY public ./public

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
