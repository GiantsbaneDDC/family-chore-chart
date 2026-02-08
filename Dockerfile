# 🏠 Family Chore Chart - Docker Build
#
# Build:  docker build -t chore-chart .
# Run:    docker run -d -p 8080:8080 --name chore-chart chore-chart
#

FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

COPY server/package*.json ./server/
RUN cd server && npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN cd server && npx prisma generate

# Build frontend
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
WORKDIR /app/server
CMD ["node", "index.js"]
