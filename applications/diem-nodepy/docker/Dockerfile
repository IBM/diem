FROM nikolaik/python-nodejs:python3.9-nodejs16

LABEL   maintainer=guy_huinen@be.ibm.com \
    org.label-schema.description="Diem Nodepy Application" \
    org.label-schema.name="nodepy" \
    org.label-schema.version=$BUILD_VERSION

ARG BUILD_DATE
LABEL org.label-schema.build-date=$BUILD_DATE

RUN apt-get update && \
    apt-get install -y openjdk-11-jre-headless && \
    apt-get clean;

COPY jars/* /opt/spark/jars/

WORKDIR /app

# RUN apk add --update gcc g++ python3-dev

RUN python3 -m pip install --upgrade pip

COPY requirements.txt $HOME
RUN python3 -m pip install --prefer-binary -r requirements.txt

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production
COPY package.json package-lock.json $HOME/

RUN cd $HOME && npm ci --production

# RUN python3 -m pip install --index-url https://test.pypi.org/simple/ diemlib==0.0.11b3

WORKDIR $HOME
COPY server $HOME/server

RUN chmod -R 775 .

CMD [ "node", "./server/server.js" ]