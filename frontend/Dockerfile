# === Build Stage ===
FROM node:18 AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app and build it
COPY public ./public
COPY src ./src
COPY package.json ./
COPY package-lock.json ./

RUN npm run build

# === Production Stage ===
FROM nginx:stable
COPY --from=builder /app/build /usr/share/nginx/html
# REMOVE this line to avoid double-mounting:
# COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY public/images /usr/share/nginx/html/images

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
