# Building Spark

> We are using our own build of spark because of a bug for db2. We build it by downloading the spark binaries and running the build commands

## Download spark

Link to spark [https://github.com/apache/spark](https://github.com/apache/spark)

Method 1: clone the branch

```cmd
git clone --single-branch --branch branch-3.1 https://github.com/apache/spark
```

method 2: download and extract the version you can find on the spark github repo [https://github.com/apache/spark/tags](https://github.com/apache/spark/tags)

download the zip or tar.gz to a directory

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

## Compile spark / build the images or build the distribution

### Building the spark images using the default debian baseline

Create the images, please note of the image name and tag: 3.0.0  / 3.1.0 etc.. depending on the version you want to build

#### Build spark

```cmd
./build/mvn -Pkubernetes -DskipTests clean package
```

This seems to work also

```cmd
dev/make-distribution.sh -Pkubernetes
```

#### Build the image from the spark build

please specify your image name eg 127.0.0.1:30500/etl-mgr for a local repository

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

#### Tagging the Images and push to a repository (Manually)

The spark images can be pushed to any repository where you can use them directly in your deployments or where they can serve as base image for more customisations

Tagging an image (spark 3.1.0)

#### Pushing to Quay

```cmd
docker tag 127.0.0.1:30500/etl-mgr/spark-py:3.1.1 quay.io/diem/base-pyspark:3.1.1
docker tag 127.0.0.1:30500/etl-mgr/spark:3.1.1 quay.io/diem/base-spark:3.1.1
127.0.0.1:30500/etl-mgr/spark:3.1.1
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

#### Pushing to artifactory (if you have access)

```cmd
docker login -u "username" -p "password" txo-sets-docker-local.artifactory.swg-devops.com
docker tag 127.0.0.1:30500/bizops/spark:2.4.5 txo-sets-docker-local.artifactory.swg-devops.com/bizops/spark-java:2.4.5
docker push txo-sets-docker-local.artifactory.swg-devops.com/bizops/spark-java:2.4.5
```

### Building a distribution to be used in other Images

#### Build the distribution

```cmd
export MAVEN_OPTS="-Xss64m -Xmx2g -XX:ReservedCodeCacheSize=1g"
```

```cmd
./dev/make-distribution.sh --name custom-spark --pip --tgz -Pkubernetes
```

This should create file in the root of the spark directly called : **spark-3.1.2-bin-custom-spark.tgz**

#### Host distribution in empty docker image

There's limit for maximum file size in git so you cannot host these files easily.

You can always host and love these files to an external location like Cloud Object Storage (IBM) or AWS

In our case we will store the tar into an empty docker image, unzip it and upload it to quay

We will then include this image in a multi stage build

A. Create an empty Dockerfile in the root of your spark directory where the rag.gz is located and copy the following text

  ```Docker
  FROM scratch

  ARG img=spark-3.1.2-bin-custom-spark

  COPY ${img}.tgz /tmp/${img}.tgz
  ```

  Note: copy of this code is located in diem-public/applications/diem-spark/images/Dockerfile.base

B. Build the image

  ```cmd
  docker build -t quay.io/diem/base-spark:3.1.2_rhel
  ```

C. Push this image to you repo

  ```cmd
  docker push quay.io/diem/base-spark:3.1.2_rhel
  ```

D. use it in your multilayer build

```docker
FROM quay.io/diem/base-spark:3.1.2_rhel as base_spark
FROM registry.access.redhat.com/ubi8/ubi as base
...
COPY --from=base_spark /tmp ${install_dir}/
```

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

