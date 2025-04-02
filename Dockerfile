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

# Install Python, pip and required system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files and Python requirements
COPY package*.json ./
COPY server/requirements.txt ./

# Install production dependencies
RUN npm ci --only=production
ENV PYTHONPATH=/app
RUN python3 -m pip install --no-cache-dir -r requirements.txt

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY server/*.py ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]