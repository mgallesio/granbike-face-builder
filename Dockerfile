FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    openjdk-17-jre-headless \
    unzip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

RUN npm --prefix backend ci \
  && npm --prefix frontend ci

COPY . .

RUN npm --prefix frontend run build

ENV NODE_ENV=production
ENV PORT=3000
ENV TMP_DIR=/tmp/granbike-face-builder
ENV JAVA_PATH=java

EXPOSE 3000

CMD ["node", "backend/start-render.js"]
