FROM node:20-alpine as builder

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install -g npm
RUN npm install

COPY . .

RUN npm run build


FROM node:20-alpine

RUN apk update && apk upgrade

RUN npm install -g pm2 
    
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package.json ./

COPY --from=builder /usr/src/app/build/ ./build

COPY --from=builder /usr/src/app/ecosystem.config.js ./

COPY --from=builder /usr/src/app/entrypoint.sh ./

COPY --from=builder /usr/src/app/node_modules ./node_modules

RUN npm prune --omit=dev && \
    mkdir logs && \
    chmod +x entrypoint.sh && \
    npm cache clean --force && \
    npm prune --production


EXPOSE 4007

ENTRYPOINT ["./entrypoint.sh"]