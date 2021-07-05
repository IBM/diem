FROM jupyter/pyspark-notebook:python-3.8.8

COPY docker/jupyter-pyspark/local/jars/* /usr/local/spark/jars/
COPY docker/jupyter-pyspark/local/requirements.txt /tmp/requirements.txt

WORKDIR /tmp

RUN python3 -m pip install --upgrade pip &&\
    python3 -m pip install --prefer-binary -r requirements.txt

WORKDIR /home/shared