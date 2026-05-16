FROM node:20-alpine

WORKDIR /app

# Install build tools required by better-sqlite3 (native addon)
RUN apk add --no-cache python3 make g++

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Remove build tools to keep image small
RUN apk del python3 make g++

# Copy source
COPY src/ ./src/

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/index.js"]
