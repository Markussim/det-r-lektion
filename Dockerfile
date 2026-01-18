FROM ubuntu:24.04

# Install Node.js and other dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

# Set the working directory
WORKDIR /app
# Copy package.json and package-lock.json
COPY package*.json ./
# Install Node.js dependencies
RUN npm install
# Copy the rest of the application code
COPY . .

# Run the application
CMD ["node", "index.js"]