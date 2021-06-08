FROM registry.access.redhat.com/ubi8/python-39 as base

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

ARG BUILD_DATE

LABEL maintainer=guy_huinen@be.ibm.com \
    org.label-schema.description="Diem Nodepy Application" \
    org.label-schema.name="nodepy" \
    org.label-schema.version=$BUILD_VERSION \
    org.label-schema.build-date=$BUILD_DATE

USER root

RUN yum install -y java-11-openjdk-headless.x86_64 && \
    rm -rf /var/lib/apt/lists/*;

COPY jars/* /opt/spark/jars/

FROM base

WORKDIR $HOME

# RUN apk add --update gcc g++ python3-dev

COPY requirements.txt $HOME

RUN python3 -m pip install --upgrade pip && python3 -m pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY package.json package-lock.json $HOME/

RUN npm ci --production

# RUN python3 -m pip install --index-url https://test.pypi.org/simple/ diemlib==0.0.11b3

COPY server $HOME/server

RUN chmod -R 775 .
USER 1001

CMD [ "node", "./server/server.js" ]