FROM registry.access.redhat.com/ubi9/nodejs-16 as base

USER root

RUN dnf update -y && dnf upgrade -y

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

COPY package.json package-lock.json $HOME/

RUN cd $HOME && npm ci --production

WORKDIR $HOME

COPY server $HOME/server

RUN chmod -R 775 .

FROM scratch

COPY --from=base / /

ARG BUILD_DATE

LABEL maintainer=guy_huinen@be.ibm.com \
    org.label-schema.description="Diem Operator" \
    org.label-schema.name="operator" \
    org.label-schema.version=$BUILD_VERSION \
    org.label-schema.build-date=$BUILD_DATE

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

WORKDIR $HOME

USER 1001

CMD [ "node", "./server/server.js" ]