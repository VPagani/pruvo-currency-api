FROM node:16-alpine

# need bash for wait.sh
RUN apk update && apk add bash
COPY wait.sh /usr/local/bin/wait

COPY package.json /usr/local/bin/service/
COPY yarn.lock /usr/local/bin/service/

WORKDIR /usr/local/bin/service/
RUN yarn install --frozen-lockfile --production

COPY dist /usr/local/bin/service/dist/
EXPOSE 8000

WORKDIR /usr/local/bin/service/dist
