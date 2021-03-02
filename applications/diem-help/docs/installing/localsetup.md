# Quickstart

> This provides an overview on how to install Diem on your local kubernetes

This assumes you are using docker for mac

And that you have installed the kubectl cli

## Brew and Helm

### Brew

With brew you can install local packages. You can find more documentation on the [Brew Website](https://docs.brew.sh/Installation)

Brew is needed to install kubectl

```cmd
brew install kubectl

or

brew upgrade kubernetes-cli
```

### Helm

You can install helm from here: [Helm install](https://helm.sh/docs/intro/install/)

if you have brew it install from brew you can upgrade it here

```cmd
~$: helm version
version.BuildInfo{Version:"v3.4.2", GitCommit:"23dd3af5e19a02d4f4baa5b2f242645a1a3af629", GitTreeState:"dirty", GoVersion:"go1.15.5"}

~$: brew upgrade helm

~$: helm repo add "stable" "https://charts.helm.sh/stable" --force-update
"stable" has been added to your repositories
```

! Be carefull with the helm "chart" versions, they might change

! Be carfull, helm repositories might change, google for the location of your helm chart if you have an error installing a chart

You can see your current installed charts by the cmd

```cmd
helm list
```

Important: Helm charts are being deprepated and moved to owned repositories. If some chart is not found look it up here : [https://artifacthub.io/](https://artifacthub.io/)]

## Docker

We are using docker for mac, install it from [https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)

## Dashboard

1. get link from [https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/](https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/)

2. You can fidn the versions here [https://github.com/kubernetes/dashboard/releases](https://github.com/kubernetes/dashboard/releases)

```cmd
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.1.0/aio/deploy/recommended.yaml
```

Get the dashboard secret after you installed the dashboard

```cmd
kubectl -n kubernetes-dashboard describe secret $(kubectl -n kubernetes-dashboard get secret | grep admin-user | awk '{print $1}')
```

## Redis

```cmd
$ helm repo add bitnami https://charts.bitnami.com/bitnami
"bitnami" has been added to your repositories
```

```cmd
$ helm install diem-redis bitnami/redis --version 12.1.1

NAME: diem-redis
LAST DEPLOYED: Wed Nov 25 12:42:27 2020
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
** Please be patient while the chart is being deployed **
Redis can be accessed via port 6379 on the following DNS names from within your cluster:

diem-redis-master.default.svc.cluster.local for read/write operations
diem-redis-slave.default.svc.cluster.local for read-only operations


To get your password run:

    export REDIS_PASSWORD=$(kubectl get secret --namespace default diem-redis -o jsonpath="{.data.redis-password}" | base64 --decode)

To connect to your Redis server:

1. Run a Redis pod that you can use as a client:
   kubectl run --namespace default diem-redis-client --rm --tty -i --restart='Never' \
    --env REDIS_PASSWORD=$REDIS_PASSWORD \
   --image docker.io/bitnami/redis:6.0.9-debian-10-r13 -- bash

2. Connect using the Redis CLI:
   redis-cli -h diem-redis-master -a $REDIS_PASSWORD
   redis-cli -h diem-redis-slave -a $REDIS_PASSWORD

To connect to your database from outside the cluster execute the following commands:

    kubectl port-forward --namespace default svc/diem-redis-master 6379:6379 &
    redis-cli -h 127.0.0.1 -p 6379 -a $REDIS_PASSWORD
```

take note of your redis message , you can construct a connection url as follows

- redis://default:XXXXX@diem-redis-master.default.svc.cluster.local:6379 where XXXXX is the password from above

to get the password only, you need this to put in your secrets

```cmd
kubectl get secret --namespace default diem-redis -o jsonpath="{.data.redis-password}" | base64 --decode
xxxxx
```

## Local docker registry

A local registry is used to store you containers in your local cluster, this is like docker hub for local

```cmd
$ helm repo add twuni https://helm.twun.io

$ helm install registry twuni/docker-registry --set service.nodePort=30500,service.type=NodePort --version 1.10.0

NAME: registry
LAST DEPLOYED: Fri Jan 29 09:51:27 2021
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
1. Get the application URL by running these commands:
  export NODE_PORT=$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services registry-docker-registry)
  export NODE_IP=$(kubectl get nodes --namespace default -o jsonpath="{.items[0].status.addresses[0].address}")
  echo http://$NODE_IP:$NODE_PORT
```

Test the connection, the registry can be queried at any time, for example:

```cmd
$ curl -X GET http://127.0.0.1:30500/v2/_catalog
{{"repositories":[]}

curl -X GET http://127.0.0.1:30500/v2/bizops/etl-spark-py/tags/list
{"name":"bizops/etl-spark-py","tags":["3.0.0"]}
```

ps. It will be an empty array as you have not pushed an image to it

## Mongo

Install it via the following chart, we include local values for adding a password ( only locally ) ( see git for values)

- installition is from 2020-11-25
- mongodb-10.0.5
- App Version 4.4.

```cmd
$ helm install diem-mongodb -f mongo_values.yaml bitnami/mongodb --version 10.0.5

LAST DEPLOYED: Fri Jan 29 10:01:31 2021
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
** Please be patient while the chart is being deployed **

MongoDB can be accessed via port 27017 on the following DNS name(s) from within your cluster:

    diem-mongodb.default.svc.cluster.local

To get the root password run:

    export MONGODB_ROOT_PASSWORD=$(kubectl get secret --namespace default diem-mongodb -o jsonpath="{.data.mongodb-root-password}" | base64 --decode)

To get the password for "db2admin" run:

    export MONGODB_PASSWORD=$(kubectl get secret --namespace default diem-mongodb -o jsonpath="{.data.mongodb-password}" | base64 --decode)

To connect to your database, create a MongoDB client container:

    kubectl run --namespace default diem-mongodb-client --rm --tty -i --restart='Never' --image docker.io/bitnami/mongodb:4.4.2-debian-10-r0 --command -- bash

Then, run the following command:
    mongo admin --host "diem-mongodb" --authenticationDatabase admin -u root -p $MONGODB_ROOT_PASSWORD

To connect to your database from outside the cluster execute the following commands:

    kubectl port-forward --namespace default svc/diem-mongodb 27017:27017 &
    mongo --host 127.0.0.1 --authenticationDatabase admin -p $MONGODB_ROOT_PASSWORD
```

in case of an upgrade

```cmd
helm upgrade etl-mongodb -f mongo_values.yaml bitnami/mongodb
```

## Inspector

### Building the image

Inspector is located in common/deploys/inspector

build the container and push it to your local registry. The commands are also in the package.json in inspector folder

```cmd
# change to the directory
$ cd common/deploys/inspector

$ npm run kube:local-prod
```

Warning, inspector uses an image located in the private registry Artificatory. You might need to login

```cmd
docker login -u IBM-USER -p IBM-PASS txo-sets-docker-local.artifactory.swg-devops.com
```

### Yaml

Inspector provides SSO services and is used to login to the applications

Inspector is an application developed by the Ops team, diem has made minor changes

To install inspector, you need to apply some yamls

```cmd
# for creating and external ip document
kc apply -f inspector.config.yaml
kc apply -f inspector.service.yaml
kc apply -f inspector.secret.yaml (please apply the one in your local that contains the secrets)
kc apply -f inspector.deployment.yaml
```

The inspector.secret.yaml must contain your sso clientid and secret.

## Applications

### Common Configs

These are common configs used by all applications

```cmd
$ kc apply -f common-config.yaml
common-config created
```

from hidden local direcctory

```cmd
$ kc apply -f common-secret.yaml
common-secret created
```

### Diem Nodepy (diem-nodepy)

```cmd
$ cd applications/diem-nodepy

$ npm install

$ npm run kube:local-prod
> diem-nodepy@3.7.1 kube:local-prod

$ kc apply -f diem-nodepy-config.yaml
configmap/nodepy created
$ kc apply -f diem-nodepy-deployment.yaml
deployment.apps/nodepy created
service/nodepy created
```

### ETL Manager (diem-core)

```cmd
$ cd applications/diem-core

$ npm install

# apply a file so you can work from outside kubernets (on localhost)
$ kc apply -f external-8192.yaml

# apply a shared volume
$ kc apply -f operator-claim.yaml

npm run kube:local-prod
> diem-nodepy@3.7.1 kube:local-prod

$ kc apply -f diem-core-config.yaml
$ kc apply -f diem-core-deployment.yaml
```

### Diem Help (diem-help)

```cmd
$ cd applications/diem-help

$ npm install

% npm run kube:local-prod
> diem-nodepy@3.7.1 kube:local-prod

$ kc apply -f diem-help-config.yaml
configmap/diem-help created

$ kc apply -f diem-help-deployment.yaml
```

## Proxy Ingress

This is an nginx that proxies requests to the pods.

The reason why this is a seperate nginx is that it contains a security mechanismm

Therefore all requests received by the k8 Ingress are proxied to this Proxy Ingress

### Creating the Diem Ingress Image

```cmd
$ cd common/deploys/ingress

$ docker build -t 127.0.0.1:30500/bizops/diem-ingress -f ./deploy/Dockerfile.local .
Successfully tagged 127.0.0.1:30500/bizops/diem-ingress:latest

$ docker push 127.0.0.1:30500/bizops/diem-ingress
latest: digest: sha256:d12742839e818f78afeecedae03d9c891ae2c8ef31d006a3f191ef9e9d5d0282 size: 2407
```

### Deploy Diem Ingress

After you have build and pushed the image, you can deploy it

```cmd
$ kubectl apply -f diem.ingress.service.yaml
configed

$ kubectl apply -f diem.ingress.secret.yaml
configed

$ kubectl apply -f diem.ingress.deployment.yaml
configed
```

! Be aware diem-ingress might not start until you have deployed all applications. If so please deploy them and restart diem-ingress

## Nginx Ingress

This is the kubernetes nginx proxy server used to route to the K8 Ingress

### Add the repo

```cmd
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
```

### TLS secret

> This is to enable https on your local domain, create an empty folder you can delete afterwards

```cmd
$ openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=nginxsvc/O=nginxsvc"

Generating a 2048 bit RSA private key
...............+++
..............................................................................................+++
writing new private key to 'tls.key'
-----
```

Attention don't use your local hostname as /CN like "/CN=bizops.ibm.com/O=bizops.ibm.com" otherwise nginx will expect a valid cert.
As you are working on local, you will not have a valid cert (self signed). You will see some warnings in the ngix, but eventually nginx will use
it's default certificate "controller.go:1202] Using default certificate"

### Apply the secret

```cmd
$ kubectl create secret tls tls-secret --key tls.key --cert tls.crt
secret/tls-secret created
```

### Adding the chart

```cmd
$ helm install diem-ingress ingress-nginx/ingress-nginx

NAME: diem-ingress
LAST DEPLOYED: Fri Jan 29 09:56:29 2021
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
The ingress-nginx controller has been installed.
It may take a few minutes for the LoadBalancer IP to be available.
You can watch the status by running 'kubectl --namespace default get services -o wide -w diem-ingress-ingress-nginx-controller'

An example Ingress that makes use of the controller:

  apiVersion: networking.k8s.io/v1beta1
  kind: Ingress
  metadata:
    annotations:
      kubernetes.io/ingress.class: nginx
    name: example
    namespace: foo
  spec:
    rules:
      - host: www.example.com
        http:
          paths:
            - backend:
                serviceName: exampleService
                servicePort: 80
              path: /
    # This section is only required if TLS is to be enabled for the Ingress
    tls:
        - hosts:
            - www.example.com
          secretName: example-tls

If TLS is enabled for the Ingress, a Secret containing the certificate and key must also be provided:

  apiVersion: v1
  kind: Secret
  metadata:
    name: example-tls
    namespace: foo
  data:
    tls.crt: <base64 encoded cert>
    tls.key: <base64 encoded key>
  type: kubernetes.io/tls
```

Move yourself to the yaml directory of this repo  diem-help -> docs -> installing -> yaml

```cmd
$ kubectl apply -f  diem-ingress.yaml
diem-ingress.yaml deployed
```

```txt
add --version 0.6.1  to specify a specific verion
```

## Diem Ingress

Please update your routing values first like the following example

```yml
spec:
  rules:
    - host: bizops.ibm.com
      http:
        paths:
          - backend:
              service:
                name: etl-ingress
                port:
                  number: 80
            pathType: Prefix
            path: /
          - backend:
              service:
                name: etl-mgr
                port:
                  number: 80
            pathType: Prefix
            path: /socket-server
```

```cmd
kc apply -f diem-ingress.yaml
```

## Other yamls to apply (optional)

from yaml directory

```cmd
# for creating a proxy from kubernetes to local docker couch
kc apply -f external-couche.yaml
```

## Minio

### Install via Helm 3

Minio is used as local storage for files AWS s3 Compatible

```cmd
helm repo add minio https://helm.min.io/
```

```cmd
helm install diem-minio --set accessKey=myaccesskey,secretKey=mysecretkey minio/minio --version 8.0.5

NAME: diem-minio
LAST DEPLOYED: Wed Nov 25 13:25:47 2020
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Minio can be accessed via port 9000 on the following DNS name from within your cluster:
diem-minio.default.svc.cluster.local

To access Minio from localhost, run the below commands:

  1. export POD_NAME=$(kubectl get pods --namespace default -l "release=diem-minio" -o jsonpath="{.items[0].metadata.name}")

  2. kubectl port-forward $POD_NAME 9000 --namespace default

Read more about port forwarding here: http://kubernetes.io/docs/user-guide/kubectl/kubectl_port-forward/

You can now access Minio server on http://localhost:9000. Follow the below steps to connect to Minio server with mc client:

  1. Download the Minio mc client - https://docs.minio.io/docs/minio-client-quickstart-guide

  2. Get the ACCESS_KEY=$(kubectl get secret diem-minio -o jsonpath="{.data.accesskey}" | base64 --decode) and the SECRET_KEY=$(kubectl get secret diem-minio -o jsonpath="{.data.secretkey}" | base64 --decode)

  3. mc alias set diem-minio-local http://localhost:9000 "$ACCESS_KEY" "$SECRET_KEY" --api s3v4

  4. mc ls diem-minio-local

Alternately, you can use your browser or the Minio SDK to access the server - https://docs.minio.io/categories/17
```

### Additional instructions for minio

Make sure either you config , secrets or common secrets contain these values

- For Minio

```json
"COS": {
  "accessKeyId": "myaccesskey",
  "endpoint": "http://127.0.0.1:9000",
  "s3ForcePathStyle": true,
  "secretAccessKey": "mysecretkey"
  },
```

```yaml
COS__accessKeyId: "myaccesskey"
COS__endpoint: "http://127.0.0.1:9000"
COS__secretAccessKey: "mysecretkey"
COS__s3ForcePathStyle: true,
```

- For Cloud Object Storage

```json
"COS": {
  "apiKeyId": "xxxxxx",
  "endpoint": "linktocloudobjectstorage",
  "serviceInstanceId": "serviceinstanceid"
  },
```

```yaml
COS__apiKeyId: myaccesskey",
COS__endpoint: "http://127.0.0.1:9000",
COS__serviceInstanceId: true,
```

## Couche

local couch setup, these instructions are only for a local setup, a setup within k8 is not yet documented here

```cmd
$ docker run -p 5984:5984 -d --name couchdb couchdb

couchdb
```

Now never delete this container as your data might be lost .. stop it and start it like this

```cmd
$ docker stop couchdb

couchdb stopped

$ docker start couchdb

couchdb
```

## working locally

In case you want to work from local you can port-forwards like this

```cmd
kubectl port-forward --namespace default svc/diem-redis-master 6379:6379
kubectl port-forward --namespace default svc/diem-mongodb 27017:27017
kubectl port-forward $POD_NAME 9000 --namespace default (kc get pods --namespace default -l "release=diem-minio" )
kubectl port-forward etlbizops-rabbitmq-0 5672:5672
```

## Virtual host and SSO

link to sso registration [https://ies-provisioner.prod.identity-services.intranet.ibm.com/tools/sso/application/list](https://ies-provisioner.prod.identity-services.intranet.ibm.com/tools/sso/application/list)

edit you local /etc

```cmd
$sudo nano /etc/hosts

add

127.0.0.1 wtl-manager-local.ibm.com

Ctrl+o enter Ctrl+X

```

## Artificactory and .npmrc

In order to build your application like diem-core or diem-help, certain packages are required from artifactory which is private to IBM only

You would need to login, you can do this by creating an .npmrc file to be located in the application directory. The values of this file can be optained by following [these instructions](https://pages.github.ibm.com/CIO-SETS/operations/services/artifactory/npm/#disclosure_secured_authentication_techniques)

```curl
curl -u g@ibm.com:passwword https://na.artifactory.swg-devops.com/artifactory/api/npm/txo-sets-npm-virtual/auth/sets >> ~/.npmrc
```

## Issues

A collection of potential issues reported

### Dashboard Inbstallation Error

```cmd
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.1.0/aio/deploy/recommended.yaml

Warning: kubectl apply should be used on resource created by either kubectl create --save-config or kubectl apply
deployment.apps/kubernetes-dashboard configured
service/dashboard-metrics-scraper unchanged
deployment.apps/dashboard-metrics-scraper configured
The ClusterRoleBinding “kubernetes-dashboard” is invalid: roleRef: Invalid value: rbac.RoleRef{APIGroup:“rbac.authorization.k8s.io”, Kind:“ClusterRole”, Name:“kubernetes-dashboard”}: cannot change roleRef
```

Solution

```cmd
kubectl delete clusterrolebinding kubernetes-dashboard
```

Reinstall

## Other

for db2 data studio

```cmd
docker run -h datastudio_local --name datastudio --restart=always --detach -p 5901:5901 -p 6901:6901 -v /Users/guyhuinen/Documents/workspace/db2docker:/headless/IBM/rationalsdp/workspace store/ibmcorp/data_studio:4.1.3

http://localhost:6901/?password=vncpassword/
```

Deleting a secret from github

```cmd
delete a secret
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch /applications/spark-operator/readme.md' --prune-empty --tag-name-filter cat -- --all
```
