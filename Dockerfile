# Base on official Node.js Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first (for better caching)
COPY package.json package-lock.json* .npmrc ./
RUN npm install

# Copy all files
COPY . .

# Build the Next.js application for production
# If you want to use the development server instead, comment out the next two lines
# RUN npm run build
# CMD ["npm", "start"]

# Use development server for easy debugging and hot reload
EXPOSE 3000
CMD ["npm", "run", "dev"]