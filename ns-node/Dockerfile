FROM node:20-alpine
WORKDIR /app

# Copy shared modules and scripts required by ns-node
COPY shared ./shared
COPY sources ./sources
COPY scripts ./scripts

# Copy ns-node application
COPY ns-node ./ns-node

# Install dependencies
WORKDIR /app/ns-node
RUN npm install --prod

# Expose port
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
