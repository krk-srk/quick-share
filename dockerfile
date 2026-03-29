# Use the ultra-lightweight Alpine-based Node image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
# Note: 'npm ci' is faster and more reliable for Docker builds
RUN npm ci --only=production

# Copy the rest of the source code
COPY . .

# Expose the app port
EXPOSE 5000

# Run the app
CMD [ "node", "server.js" ]