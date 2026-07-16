FROM node:20-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
# isolated-vm requiert python et g++ pour compiler sous Alpine
RUN apk add --no-cache python3 make g++ && npm install

COPY . .

FROM node:20-alpine
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["npm", "run", "start"]
