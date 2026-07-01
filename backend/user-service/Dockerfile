# Use the official Node.js 18 alpine image for a lightweight container base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to cache dependencies layers
COPY package*.json ./

# Install only production dependencies to keep the image size small
RUN npm ci --only=production

# Copy the rest of the application code into the container
COPY . .

# Expose port 3001 as required by Docker Compose port mapping
EXPOSE 3001

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Run the node server
CMD ["node", "server.js"]
