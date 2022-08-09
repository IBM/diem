FROM registry.access.redhat.com/ubi9/nodejs-16 as base

USER root

RUN dnf --disableplugin=subscription-manager -y update &&\
    dnf --disableplugin=subscription-manager -y upgrade &&\
    dnf --disableplugin=subscription-manager -y clean all

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

COPY package.json package-lock.json $HOME/

RUN cd $HOME && npm ci --production

WORKDIR $HOME

COPY public $HOME/public
COPY server $HOME/server

RUN chmod -R 775 .

FROM scratch

COPY --from=base / /

ARG BUILD_DATE

LABEL maintainer=guy_huinen@be.ibm.com \
    org.label-schema.description="Diem Core" \
    org.label-schema.name="core" \
    org.label-schema.version=$BUILD_VERSION \
    org.label-schema.build-date=$BUILD_DATE

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

WORKDIR $HOME

USER 1001

CMD [ "node", "./server/server.js" ]