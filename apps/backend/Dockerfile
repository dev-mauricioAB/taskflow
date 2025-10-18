FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN pnpm install

COPY . .

RUN pnpm run build

EXPOSE 4000
CMD ["npm", "start"]
