
# ---- Builder Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies based on the preferred lockfile
COPY package.json package-lock.json* ./

# Copy prisma files if you use Prisma, becase postinstall script needs it
COPY prisma ./prisma

RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built app and necessary files from builder
COPY --from=builder /app/.next ./.next

# uncomment for local data version
# COPY --from=builder /app/data ./data

# Use a non-root user for security (node user exists in node:alpine)
USER node

# Expose Next.js port
EXPOSE 3000

# Start the Next.js app
CMD ["next", "start"]
