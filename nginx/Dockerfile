# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Nginx with frontend files
FROM nginx:alpine
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy our nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
# Copy frontend build from stage 1
COPY --from=frontend-build /app/dist /usr/share/nginx/html
# Copy public assets (logos)
COPY frontend/public/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
