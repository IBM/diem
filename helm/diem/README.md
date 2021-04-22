# diem

A Helm chart for Diem

![Version: 1.0.2](https://img.shields.io/badge/Version-1.0.2-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 1.0.1](https://img.shields.io/badge/AppVersion-1.0.1-informational?style=flat-square)

## Installing the Chart

1. install [helm 3](https://helm.sh/docs/intro/install/)

2. Create a values.yaml file if needed and modify it with your own values

3. To install the chart with the release name `diem`:

```console
$ helm repo add diem https://ibm.github.io/diemm
$ helm install diem diem/diem -f myvalues.yaml
```

## Requirements

| Repository | Name | Version |
|------------|------|---------|
| https://charts.bitnami.com/bitnami | mongodb | 10.0.5 |
| https://googlecloudplatform.github.io/spark-on-k8s-operator | spark-operator | 1.0.8 |
| https://helm.min.io/ | minio | 8.0.10 |
| https://nats-io.github.io/k8s/helm/charts/ | nats | 0.7.4 |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| avp_path | string | `""` | This will tell the plugin where to find vault values |
| base64 | bool | `true` | encode all secrets base64 |
| common.config.K8_INSTANCE | string | `"US"` |  |
| common.config.K8_SYSTEM | string | `"uat"` |  |
| common.config.K8_SYSTEM_NAME | string | `"Diem on CRC"` |  |
| common.config.PORT | int | `8192` | the port all pods will be running under |
| common.config.diemAdmin | string | `"diem-admin"` |  |
| common.config.diemAdminRbac | string | `"diem-rbac"` |  |
| common.name | string | `"diem-common"` |  |
| common.secrets.SLACKHOOK | string | `""` | secretmapref is the name of the common secret map ref |
| controller | object | `{"podAnnotations":null}` | pod annotations |
| core.auth | object | `{"callbackUrl":"/sso/callback","clientId":"","clientSecret":"","discoveryUrl":""}` | OpenId authentication |
| core.config.APPPATH | string | `"/etl-mgr"` | important, the path the application will run under |
| core.config.s3 | object | `{"apiKeyId":"","enabled":false,"endpoint":"","serviceInstanceId":"","signatureVersion":""}` | Integrate your own cloud object storage -- leave this blank if you want to use minio integrated as a dependency -- if these value are going to be used, disable minio |
| core.config.serviceAccountName | string | `""` | if core runs with a dedicated service account |
| core.config.slack | object | `{"SLACK_DEPLOY_CHANNEL":"#diem-deploy-uat","SLACK_DEPLOY_USERNAME":"diem- (Notification)","SLACK_EMOJI":":diem:","SLACK_INTERNAL_CHANNEL":"#diem-bugs-uat","SLACK_INTERNAL_USERNAME":"diem - (Internal)","SLACK_USER_CHANNEL":"#diem-bugs-uat","SLACK_USER_USERNAME":"diem - (User)","enabled":false}` | Slack integration, enable it by putting the enabled to true |
| core.config.spark.CALLBACK_URL | string | `"/internal/spark_callback"` |  |
| core.config.spark.OPERATOR_DRIVER_CORES | string | `"2"` |  |
| core.config.spark.OPERATOR_DRIVER_MEMORY | string | `"1024m"` |  |
| core.config.spark.OPERATOR_EXECUTOR_CORES | int | `8` |  |
| core.config.spark.OPERATOR_EXECUTOR_INSTANCES | int | `2` |  |
| core.config.spark.OPERATOR_EXECUTOR_MEMORY | string | `"8G"` |  |
| core.config.spark.SPARK_IMAGE | string | `"quay.io/diem/pyspark:3.1.1-rc2"` |  |
| core.config.spark.SPARK_IMAGEPULLSECRETS | string | `""` |  |
| core.config.volume.storageClassName | string | `""` |  |
| core.config.volume.volumeClaimName | string | `"spark-shared-data"` |  |
| core.config.volume.volumeMountPath | string | `"/shared"` |  |
| core.config.volume.volumeName | string | `"spark-data"` |  |
| core.deployment | object | `{"image":"quay.io/diem/core","port":80,"replicas":1,"socketName":"etl-socket-server","tier":"backend","version":"1.0.1"}` | this relates to the diem-core deployment |
| core.deployment.socketName | string | `"etl-socket-server"` | socketName is the url the client ui socket will connect to -- for the moment Do Not Change this |
| core.name | string | `"diem-core"` | name is the name of the deployment |
| core.secrets.JWTTOKEN | string | `""` |  |
| core.secrets.MONGO_CA | string | `""` |  |
| core.secrets.MONGO_URL | string | `""` |  |
| core.secrets.SENDGRID_API | string | `""` |  |
| core.secrets.SESSION_NAME | string | `"etl.sid"` |  |
| core.secrets.SESSION_SECRET | string | `"ETLSECRETPW"` |  |
| ingress.createtls | bool | `true` | diem-tls-secret terminates example.com |
| ingress.host | string | `"example.com"` | hostname of your application |
| ingress.name | string | `"diem-ingress"` | name of your ingress |
| ingress.proxy | string | `""` | proxy is the name of your proxy host this can happen when you run in a cluster and have a proxy url |
| ingress.tls | string | `"diem-tls-secret"` |  |
| ingress.version | string | `"v1"` | K8 api version (v1 or v1beta) |
| minio.accessKey | string | `"diemadmin"` |  |
| minio.createservice | bool | `true` |  |
| minio.mountPath | string | `"/minio"` |  |
| minio.persistence.size | string | `"20Gi"` | Persistant Volume size |
| minio.resources.requests.memory | string | `"1Gi"` |  |
| minio.secretKey | string | `"diempassword"` |  |
| minio.securityContext.enabled | bool | `false` |  |
| mongodb.auth | object | `{"database":"ibmclouddb","password":"diempassword","rootPassword":"diemadmin","username":"diemadmin"}` | mongo authentication settings |
| mongodb.createservice | bool | `true` | create the mongo service |
| nats.auth.enabled | bool | `false` |  |
| nats.auth.password | string | `""` |  |
| nats.auth.user | string | `""` |  |
| nats.cluster | object | `{"enabled":true,"name":"diem-cluster","noAdvertise":true,"replicas":3}` | Nats cluster settings |
| nats.cluster.enabled | bool | `true` | enable clustering |
| nats.cluster.name | string | `"diem-cluster"` | the name of the cluster |
| nats.cluster.replicas | int | `3` | number of replicas to start |
| nats.createservice | bool | `true` |  |
| nats.exporter.enabled | bool | `false` |  |
| nats.external | bool | `false` |  |
| nats.ip | string | `"diem-nats"` |  |
| nats.name | string | `"nats"` | the name of the service |
| nats.nameOverride | string | `"diem-nats"` |  |
| nats.nats | object | `{"image":"nats:2.2.1-alpine3.13","pullPolicy":"IfNotPresent"}` | nats config settings |
| nats.natsbox.enabled | bool | `false` |  |
| nats.priorityClassName | string | `"system-node-critical"` | install nats before others |
| nats.reloader.enabled | bool | `false` |  |
| nats.replicaCount | int | `1` | number of replicas |
| nodepy.image | string | `"quay.io/diem/nodepy"` | image is the the name of the nodepy image |
| nodepy.name | string | `"diem-nodepy"` | name of the deployment |
| nodepy.port | int | `80` |  |
| nodepy.replicas | int | `1` |  |
| nodepy.tier | string | `"backend"` |  |
| nodepy.version | string | `"1.0.1"` |  |
| operator.image | string | `"quay.io/diem/operator"` | image is the the name of the nodepy image |
| operator.name | string | `"diem-operator"` | name of the deployment |
| operator.port | int | `80` |  |
| operator.replicas | int | `1` |  |
| operator.serviceAccountName | string | `""` | any service accountname |
| operator.tier | string | `"backend"` |  |
| operator.version | string | `"1.0.0"` |  |
| spark-operator.enableWebhook | bool | `true` | enables the spark webhoob |
| spark-operator.image.repository | string | `"quay.io/diem/spark-operator"` |  |
| spark-operator.image.tag | string | `"2.0.0"` |  |
| spark-operator.serviceAccounts.spark.name | string | `"spark"` |  |
| spark-operator.sparkJobNamespace | string | `""` | overwrite the spark job namespace if needed, otherwise it will |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.5.0](https://github.com/norwoodj/helm-docs/releases/v1.5.0)