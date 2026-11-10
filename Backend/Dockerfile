FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN DATABASE_URL="mysql://build:build@localhost:3306/build" npx prisma generate
RUN npm run build

EXPOSE 6005

CMD ["node", "dist/src/main.js"]
