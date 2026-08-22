FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "npm run migrate && npm start"]
