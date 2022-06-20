# Quickstart

> This provides an overview on how to install Diem on your local kubernetes

This assumes you are using docker for mac

And that you have installed the kubectl cli

## Prerequisites Things you (might) need

### kubectl

With brew you can install local packages. You can find more documentation on the [Brew Website](https://docs.brew.sh/Installation)

Brew is needed to install kubectl

```cmd
brew install kubectl

or

brew upgrade kubernetes-cli
```

More information and methods here [https://kubernetes.io/docs/tasks/tools/](https://kubernetes.io/docs/tasks/tools/)

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

## Runtimes (3 described)

> You need a runtime that will be running your kubernetes platform

### Docker

You can use docker for mac or windows, install it from [https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)

### Rancher Desktop

You can install rancher desktop from [https://github.com/rancher-sandbox/rancher-desktop/releases](https://github.com/rancher-sandbox/rancher-desktop/releases)

### CRC (Code ready containers) Openshift

See section on Openshift

## Supporting Utilities

> This does not apply if your runtime is CRC (already build in), but you (might) need a k8 dashboard and you need an nginx to access your cluster from your browser

### Dashboard

1. get link from [https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/](https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/)

2. You can find the releases here [https://github.com/kubernetes/dashboard/releases](https://github.com/kubernetes/dashboard/releases)

```cmd
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.5.1/aio/deploy/recommended.yaml
```

##### Update the admin service account for accessing the dashboard

Save the following file to your local disk and apply it (eg admin-user.yaml)

If there is an error that the file already exists, delete it first

```cmd
kubectl delete ClusterRoleBinding kubernetes-dashboard
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
 name: admin-user
 namespace: kubernetes-dashboard

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
 name: admin-user
roleRef:
 apiGroup: rbac.authorization.k8s.io
 kind: ClusterRole
 name: cluster-admin
subjects:
 - kind: ServiceAccount
   name: admin-user
   namespace: kubernetes-dashboard
```

```cms
$ kubectl apply -f admin-user.yaml
clusterrolebinding.rbac.authorization.k8s.io/admin-user created
```

#### Start the dashboard

```cmd
$ kubectl proxy
Starting to serve on 127.0.0.1:8001
```

Get the dashboard secret after you installed the dashboard

```cmd
kubectl -n kubernetes-dashboard describe secret $(kubectl -n kubernetes-dashboard get secret | grep admin-user | awk '{print $1}')
```

You can access the Dashboard on [http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/](http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/)

Paste in the token

### Local docker registry

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

### Nginx Ingress

> This is the kubernetes nginx proxy server used to route to the K8 Ingress
> Iportant: This is only needed for docker desktop, rancher and crc have this already included

#### Add the repo

```cmd
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
```

#### TLS secret

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

### Add pod annotation for running on local

When you want to deploy diem on your local cluster in combination with an ingress-nginx then the ingress itself requires an annotation

```
kubernetes.io/ingress.class: nginx
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

```txt
add --version 0.6.1  to specify a specific verion
```

### Other yamls to apply (optional)

from yaml directory

```cmd
# for creating a proxy from kubernetes to local docker couch
kc apply -f external-couche.yaml
```

### Minio

#### Install via Helm 3

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

#### Additional instructions for minio

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
COS__accessKeyId: 'myaccesskey'
COS__endpoint: 'http://127.0.0.1:9000'
COS__secretAccessKey: 'mysecretkey'
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

### Couche

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

## Other Items

### working locally

In case you want to work from local you can port-forwards like this

```cmd
kubectl port-forward --namespace default svc/diem-redis-master 6379:6379
kubectl port-forward --namespace default svc/diem-mongodb 27017:27017
kubectl port-forward $POD_NAME 9000 --namespace default (kc get pods --namespace default -l "release=diem-minio" )
kubectl port-forward -n default svc/diem-nats 4222:4222
```

### Virtual host and SSO

link to sso registration [https://ies-provisioner.prod.identity-services.intranet.ibm.com/tools/sso/application/list](https://ies-provisioner.prod.identity-services.intranet.ibm.com/tools/sso/application/list)

edit you local /etc

```cmd
$sudo nano /etc/hosts

add

127.0.0.1 wtl-manager-local.ibm.com

Ctrl+o enter Ctrl+X

```

## Potential Issues

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
