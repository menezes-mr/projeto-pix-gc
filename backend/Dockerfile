FROM node:18-alpine

WORKDIR /app

# Instalar dependências necessárias para o Prisma (OpenSSL)
RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3333

# Em produção, usa o node dist/main
CMD ["sh", "-c", "npx prisma db push && npm run start:prod"]
