FROM node:16-alpine

# need bash for wait.sh
RUN apk update && apk add bash
COPY wait.sh /usr/local/bin/wait

COPY package.json /usr/local/bin/service/
COPY yarn.lock /usr/local/bin/service/

WORKDIR /usr/local/bin/service/
RUN yarn install --frozen-lockfile --production

COPY tsconfig.json /usr/local/bin/service/
COPY src /usr/local/bin/service/src/
RUN yarn build && rm -rf src tsconfig.json

EXPOSE 8000
WORKDIR /usr/local/bin/service/dist
