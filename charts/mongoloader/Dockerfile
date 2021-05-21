FROM node:16.2.0-alpine

LABEL maintainer=guy_huinen@be.ibm.com \
    org.label-schema.description="Diem Mongo Loader" \
    org.label-schema.name="core" \
    org.label-schema.version=$BUILD_VERSION

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

COPY package.json package-lock.json $HOME/

RUN cd $HOME && npm ci --production

WORKDIR $HOME
COPY index.mjs $HOME/index.mjs
COPY data $HOME/data

RUN chmod -R 775 .

CMD [ "node", "index.mjs" ]