FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "start"]