FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@8.5.0 --activate && pnpm install --prod
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
