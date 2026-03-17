FROM node:20-alpine AS build

WORKDIR /app

# Accept Google Client ID at build time
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Accept API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Set default env variables
ENV PORT=8080
ENV BACKEND_URL=https://backend-dev-866351374703.europe-southwest1.run.app

COPY --from=build /app/dist /usr/share/nginx/html

# Use the official Nginx image feature: it looks for .template files in /etc/nginx/templates/
# and substitutes environment variables into /etc/nginx/conf.d/ at startup.
RUN mkdir -p /etc/nginx/templates
RUN echo 'server { \
    listen ${PORT}; \
    location / { \
    root /usr/share/nginx/html; \
    try_files $uri $uri/ /index.html; \
    } \
    location /api { \
    proxy_pass ${BACKEND_URL}; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    proxy_ssl_server_name on; \
    proxy_cache_bypass $http_upgrade; \
    } \
    }' > /etc/nginx/templates/default.conf.template

EXPOSE 8080

# The standard Nginx entrypoint will automatically handle the template substitution
CMD ["nginx", "-g", "daemon off;"]