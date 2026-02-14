FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN npm install
RUN npm run -w packages/shared build && npm run -w packages/engine build && npm run -w apps/worker build
EXPOSE 4000
CMD ["node", "apps/worker/dist/index.js"]
