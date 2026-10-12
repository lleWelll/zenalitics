FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Параллельность запросов к аналитике. 1 — пока в бэке гонка на общем соединении DuckDB.
ARG VITE_API_CONCURRENCY=1
ENV VITE_API_CONCURRENCY=$VITE_API_CONCURRENCY
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
