# Multi-stage lightweight Node.js Docker container for Sehat Setu
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package descriptors
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts || npm install --production

# Copy application files
COPY hackfest ./hackfest
COPY test_suite.js ./test_suite.js

# Expose standard port
EXPOSE 3000

# Healthcheck instruction for container orchestrators (Docker Swarm / Kubernetes / AWS ECS)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start Sehat Setu server
CMD ["node", "hackfest/server.js"]
