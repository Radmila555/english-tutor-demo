FROM node:22.23.3-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

COPY package*.json ./

RUN npm ci --omit=dev --include=optional \
  && npm cache clean --force

COPY backend ./backend
COPY frontend ./frontend
COPY foto.png Foto2.png ./

EXPOSE 8080

CMD ["npm", "start"]
