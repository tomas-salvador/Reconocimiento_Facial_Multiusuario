# frontend/Dockerfile

# 1. Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json vite.config.js ./
RUN npm install
COPY . .
RUN npm run build        # genera /dist

# 2. Servir con nginx
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
