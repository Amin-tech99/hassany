# Build stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and Python requirements
COPY package*.json ./
COPY server/requirements.txt ./

# Install production dependencies
RUN npm ci --only=production
RUN pip3 install -r requirements.txt

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY server/*.py ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]