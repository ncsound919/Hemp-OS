FROM node:22-alpine

WORKDIR /app

# Install system dependencies for sharp
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /data && npm run build

EXPOSE 3100

CMD ["node", "dist/server.cjs"]
