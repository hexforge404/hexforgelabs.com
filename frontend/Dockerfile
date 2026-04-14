# === Build Stage ===
FROM node:18 AS builder
WORKDIR /app

ARG BUILD_ID=unknown
ARG BUILD_TIMESTAMP=unknown
ENV REACT_APP_BUILD_ID=$BUILD_ID
ENV REACT_APP_BUILD_TIMESTAMP=$BUILD_TIMESTAMP

# Install dependencies
COPY package*.json jsconfig.json ./
RUN npm install

# ✅ bring in env BEFORE build (CRA injects at build-time)
COPY .env* ./

# Copy app source + config and build it
COPY public ./public
COPY src ./src

RUN rm -rf build && npm run build

# Ensure public/images is copied into the final build output
RUN mkdir -p build/images && cp -R public/images/* build/images/

# === Production Stage ===
FROM nginx:stable
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
