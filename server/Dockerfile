# Build context must be the REPO ROOT (not server/), since this imports
# ../src/game/*.ts — e.g. `docker build -f server/Dockerfile .`
FROM node:22-slim AS build
WORKDIR /repo
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install
COPY src/game ./src/game
COPY server ./server
RUN cd server && npm run build

FROM node:22-slim
WORKDIR /repo
COPY --from=build /repo/server/package.json /repo/server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev
COPY --from=build /repo/server/dist ./server/dist
ENV NODE_ENV=production
EXPOSE 2567
CMD ["node", "server/dist/server/src/index.js"]
