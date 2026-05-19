# Use node 20 alpine for a lightweight image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Configure npm to be more resilient to network timeouts
# This helps prevent ECONNRESET errors on unstable connections by increasing retries and timeouts
RUN npm config set fetch-retries 10 && \
    npm config set fetch-retry-mintimeout 100000 && \
    npm config set fetch-retry-maxtimeout 600000

# Copy only package files first to leverage Docker layer caching
# This layer will only be rebuilt if package.json or package-lock.json changes
COPY package*.json ./

# Install dependencies and clean cache to keep the image small
# Because we copied package files separately, this step is now cached
RUN npm install && npm cache clean --force

# Copy the rest of the application source code
# Changes to your code will only trigger a rebuild from this line downwards
COPY . .

# Expose the backend port
EXPOSE 5000

# Start the application in development mode
CMD ["npm", "run", "dev"]