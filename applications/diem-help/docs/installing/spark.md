# About Spark

We will use the instructions from here [https://github.com/GoogleCloudPlatform/spark-on-k8s-operator](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator)

## Building Spark

> We are using our own build of spark because of a bug for db2. We build it by downloading the spark binaries and running the build commands

### Downloading Spark

Link to spark [https://github.com/apache/spark](https://github.com/apache/spark)

Method 1: clone the branch

```cmd
git clone --single-branch --branch branch-2.4 https://github.com/apache/spark
```

method 2: download and extract the version you can find on the spark github repo [https://github.com/apache/spark](https://github.com/apache/spark)

## Fix the db2 bug

There's currently a bug in db2 where spark fails to truncate a database when truncate is enabled.

In order to fix this go to the db2 dialect -> "DB2Dialect.scala"

```cmd
./sql/core/src/main/scala/org/apache/spark/sql/jdbc/DB2Dialect.scala
```

Add the following code at the end of that file appending the truncate override

```scala
override def getTruncateQuery(
      table: String,
      cascade: Option[Boolean] = isCascadingTruncateTable): String = {
      s"TRUNCATE TABLE $table IMMEDIATE"
  }
```

## Compile spark and run the toolkit to build the images

Create the images, please note of the image name and tag: 3.0.0  / 3.1.0 etc.. depending on the version you want to build

```cmd
./build/mvn -Pkubernetes -DskipTests clean package
```

## Build the spark images

```cmd
./bin/docker-image-tool.sh -r 127.0.0.1:30500/etl-mgr -t 3.1.1 -p ./resource-managers/kubernetes/docker/src/main/dockerfiles/spark/bindings/python/Dockerfile build
```

This should create 2 images on your local docker repo

```cmd
docker images

REPOSITORY                                                            TAG                   IMAGE ID       CREATED             SIZE
127.0.0.1:30500/etl-mgr/spark-py                                      3.1.0                 ce1b7ed87b14   2 minutes ago       861MB
127.0.0.1:30500/etl-mgr/spark                                         3.1.0                 54dfef9448b3   3 minutes ago       483MB
```

## Tagging the Images and push to a repository

The spark images can be pushed to any repository where you can use them directly in your deployments or where they can serve as base image for more customisations

Tagging an image (spark 3.1.0)

```cmd
docker tag 127.0.0.1:30500/etl-mgr/spark-py:3.1.1 quay.io/diem/spark:base-spark-py-3.1.1
docker tag 127.0.0.1:30500/etl-mgr/spark:3.1.1 quay.io/diem/spark:base-spark-3.1.1
```

push the images to your repository

```cmd
$ docker login quay.io

Username: xxx
Password: xxxx
Login Succeeded

$ docker push docker push quay.io/diem/spark:base-spark-py-3.1.1
base-spark-py-3.1.1: digest: sha256:688b76f5f35f395105a75011fd796bfb5c7e5851eefbc87c19b536f78631f7ef size: 4300

$ docker push quay.io/diem/spark:base-spark-3.1.1
base-spark-3.1.1: digest: sha256:d7ca1401b7b8b920de49481204f1eb3c7eef52bbb06326717b6f63a349c8c48a size: 3459
```

You can now pull the images from the diem docker repository [https://hub.docker.com/r/huineng/diem](https://hub.docker.com/r/huineng/diem)

## Host it on artifactory (if you have access)

```cmd
docker login -u "username" -p "password" txo-sets-docker-local.artifactory.swg-devops.com
docker tag 127.0.0.1:30500/bizops/spark:2.4.5 txo-sets-docker-local.artifactory.swg-devops.com/bizops/spark-java:2.4.5
docker push txo-sets-docker-local.artifactory.swg-devops.com/bizops/spark-java:2.4.5
```

## Building the spark images for DIEM

> This process will use the spark base images and install additional libraries, especially python packages for sparkpy

- building locally is done via package.json
- building to cloud is done via the CI/CD process (build.yaml)

### Building locally

This process uses package.json scripts for easy install

The purpose is to build a customized spark images that includes several python libraries and is prepared for openshift

Dockerfile

```dockerfile
FROM quay.io/diem/spark:base-spark-py-3.1.1

COPY db2-jars/* /opt/spark/jars/
COPY stocator/* /opt/spark/jars/

WORKDIR /opt/

# For spark 3 we need t install them as root and then switch back

USER root

RUN python3.7 -m pip install --upgrade pip

COPY requirements.txt $HOME
RUN python3.7 -m pip install --prefer-binary -r requirements.txt

RUN chmod -R 775 .

# USER 185
```

- go to ./applications/diem-spark
- make sure that in the config and scripts section of the package json your spark version is specified

```json
"config": {
    "spark_v3": "quay.io/diem/spark:spark-3.1.1",
    "spark_py_v3": "quay.io/diem/spark:spark-py-3.1.1",
  },
"scripts": {
    "kube:spark-py-v3": "npm-run-all docker:build_spark_py_v3 docker:push_spark_py_v3",
    "kube:spark-v3": "npm-run-all docker:build_spark_v3 docker:push_spark_v3",
}
```

Run the following npm command to create and push you new image to your local kubernetes

```cmd
$ npm run kube:spark-v3

The push refers to repository [quay.io/diem/spark]
.1.0: digest: sha256:e85f75d70407fda1eb36a42d43ebfc3bcc41fe8ca59ca6472a2a8ba7b26bff02 size: 4097

npm run kube:spark-etl-py-v3

The push refers to repository [127.0.0.1:30500/bizops/etl-spark-py]
3.1.0: digest: sha256:09c7b64879d98183c13f345ba92f2a39022cea67bb2ae7831797a9fa136c775f size: 5353
```

### CI/CD Process

Move to the ./applications/diem-spark

- Make sure the version-spark-3.txt is at the release you need
- verify your build.yaml

```txt
3.1.1
```

```yaml
before_install:
  - conveyor artifactory init -s sets
script:
  - docker login -u=$AF_USER -p="$AF_PWD" "txo-sets-docker-local.artifactory.swg-devops.com"
  - docker build -f deploy/Dockerfile-spark-py-$(cat version-spark-3.txt) -t $DOCKER_REGISTRY/etl-mgr/etl-spark-py:$(cat version-spark-3.txt) .
  - docker build -f deploy/Dockerfile-spark-$(cat version-spark-3.txt) -t $DOCKER_REGISTRY/etl-mgr/etl-spark:$(cat version-spark-3.txt) .
deploy:
  - docker push $DOCKER_REGISTRY/etl-mgr/etl-spark-py:$(cat version-spark-3.txt)|| checkForStepFailure $? "docker push"
  - docker push $DOCKER_REGISTRY/etl-mgr/etl-spark:$(cat version-spark-3.txt)|| checkForStepFailure $? "docker push"
```

- Commit and make a pull request

## Running your images

See the spark operator section on how to install the spark oeprator

To use a specific version of spark modify the etl-config.yaml and specify your version

```yaml
"SPARK__IMAGE": "127.0.0.1:30500/bizops/etl-spark-py:3.1.0",
```

## Stocator and COS

Spark uses a direct connection to cos so that you can use it as

```txt
cos://diem-core-uat-bizops.mycos/DataUser.jar
```

Follow these steps

```cmd
git clone https://github.com/SparkTC/stocator
cd stocator
git fetch
git checkout -b 1.1.3-ibm-sdk origin/1.1.3-ibm-sdk
mvn clean install -Dmaven.test.skip=true
```

The jar will be located in the stocator/target as stocator-1.1.3-IBM-SDK.jar

rename it to stocator-1.1.3.jar and place it in /applications/diem/spark/stocator so that it can be used by the spark image

