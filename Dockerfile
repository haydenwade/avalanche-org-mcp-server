FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json tsconfig.json ./
COPY src ./src
COPY test ./test

RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
ENTRYPOINT ["node", "dist/src/index.js"]
