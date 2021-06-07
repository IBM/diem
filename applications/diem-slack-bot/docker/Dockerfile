FROM node:16.3.0-alpine3.13

LABEL maintainer=guy_huinen@be.ibm.com
LABEL com.ibm.service.name=etl-manager

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

COPY package.json package-lock.json $HOME/

RUN cd $HOME && npm ci -q --production

WORKDIR $HOME
COPY public $HOME/public
COPY server $HOME/server

RUN chmod -R 775 .

CMD [ "node", "./server/server.js" ]