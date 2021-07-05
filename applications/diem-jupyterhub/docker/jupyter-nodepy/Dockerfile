FROM jupyter/scipy-notebook:python-3.8.8

## whoami you can use this to see who the user is


USER root

RUN apt-get update && \
    apt-get install -y openjdk-11-jre-headless && \
    apt-get clean;

# RUN apt-get -y -qq update \
#    && apt-get -y -qq install make gcc

USER jovyan

COPY docker/jupyter-nodepy/local/jars/* /usr/local/spark/jars/
COPY docker/jupyter-nodepy/local/requirements.txt /tmp/requirements.txt

WORKDIR /tmp

RUN python3 -m pip install --upgrade pip && python3 -m pip install --prefer-binary -r requirements.txt

WORKDIR /home/shared