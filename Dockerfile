FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (need tsx for runtime)
RUN npm ci

# Copy server code
COPY server/ ./server/

# Cloud Run sets PORT env var
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# Run with tsx for TypeScript support
CMD ["npx", "tsx", "server/server.ts"]
