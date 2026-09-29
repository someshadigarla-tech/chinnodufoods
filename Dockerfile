FROM node:20-alpine

WORKDIR /app

# Copy package definitions and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose default web port
EXPOSE 8080

# Environment defaults
ENV PORT=8080
ENV NODE_ENV=production

# Start production server
CMD ["node", "server.js"]
