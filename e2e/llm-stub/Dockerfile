FROM node:20-alpine
WORKDIR /app
COPY package.json package.json
RUN npm ci --production
COPY . .
EXPOSE 5555
CMD ["node", "app.js"]
