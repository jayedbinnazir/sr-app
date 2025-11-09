# ---- BUILD STAGE ----
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build

# ---- RUN STAGE ----
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./

RUN npm install --omit=dev

EXPOSE 5000

CMD ["npm", "run", "start:prod"]

