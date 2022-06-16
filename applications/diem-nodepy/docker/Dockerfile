FROM registry.access.redhat.com/ubi8/python-39 as base

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

ARG BUILD_DATE

LABEL maintainer=guy_huinen@be.ibm.com \
    org.label-schema.description="Diem Nodepy Application" \
    org.label-schema.name="nodepy" \
    org.label-schema.version=$BUILD_VERSION \
    org.label-schema.build-date=$BUILD_DATE

USER root

# silently update (-y) yum and install java openjdk headless
RUN dnf --disableplugin=subscription-manager --allowerasing -y update &&\
    dnf --disableplugin=subscription-manager --allowerasing -y upgrade &&\
    dnf --disableplugin=subscription-manager -y clean all

RUN dnf -y java-11-openjdk-headless.x86_64 &&\
    rm -rf /var/lib/apt/lists/*;

WORKDIR /

RUN mkdir /src
ADD https://gitlab.com/api/v4/projects/4207231/packages/generic/graphviz-releases/2.47.3/graphviz-2.47.3.tar.gz /src
RUN tar xzf /src/graphviz-2.47.3.tar.gz -C /src

WORKDIR /src/graphviz-2.47.3
RUN ./configure --with-gts --prefix=/usr
RUN make && make install

# copy the spark jars over
COPY jars/* /opt/spark/jars/

WORKDIR $HOME

# RUN apk add --update gcc g++ python3-dev

COPY requirements.txt $HOME

COPY package.json package-lock.json $HOME/

RUN npm ci --production

# RUN python3 -m pip install --index-url https://test.pypi.org/simple/ diemlib==0.0.11b3

COPY server $HOME/server

RUN dot -c

RUN rm -r /src

RUN dnf clean all

RUN chmod -R 775 .

FROM scratch

COPY --from=base / /

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

WORKDIR $HOME

RUN python3 -m pip install --upgrade pip && python3 -m pip install --no-cache-dir --prefer-binary -r requirements.txt

ARG BUILD_DATE

LABEL maintainer=guy_huinen@be.ibm.com \
    org.label-schema.description="Diem Nodepy Application" \
    org.label-schema.name="nodepy" \
    org.label-schema.version=$BUILD_VERSION \
    org.label-schema.build-date=$BUILD_DATE

#ENV PATH="/opt/app-root/bin:/opt/app-root/src/.local/bin/:/opt/app-root/src/bin:/opt/app-root/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

USER 1001

CMD [ "node", "./server/server.js" ]