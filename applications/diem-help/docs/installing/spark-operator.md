# About spark Operator

We will use the instructions from here [https://github.com/GoogleCloudPlatform/spark-on-k8s-operator](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator)

> We use helm 3

## Preparing the operator image

- We use a custom Operator image as we include some Cloud Object Storage Jars to connect to aws and ibm cloud (cos)

You can find the Operator base image going to the [GoogleCloudPlatform](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator) and find the version matrix

- Go to the diem-spark directory
- run the npm command to build the image

```cmd
npm run kube:spark-operator

The push refers to repository [127.0.0.1:30500/bizops/spark-operator]
1.0.0: digest: sha256:87ace624161bf3409b33b99deab9e49f14c5801ff3250bfb7fc5b7560a358998 size: 4097
```

Your image is now pushed to your local directory

## CI/CD

tbd

## Installation Steps

First add the repository to you local

```cmd
helm repo add incubator https://charts.helm.sh/incubator
```

Assign a service account. You need this to ensure the operator has the rights to start, stop and delete pods.

Add cluster role binding in case of a problem. See also reference [https://github.com/GoogleCloudPlatform/spark-on-k8s-operator/issues/454](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator/issues/45)

```cmd
kubectl create clusterrolebinding spark-role --clusterrole=cluster-admin --serviceaccount=default:spark --namespace=default
```

The below is the method the etl-manager uses, it adds the jobspace name and enables the webhook
The namespace in this case is default and it also assigns the service account

In case of error below you can update your repo

```cmd
Error: failed to download "incubator/sparkoperator" (hint: running `helm repo update` may help)

$ helm repo update
Update Complete. ⎈Happy Helming!⎈
```

### Install the operator

- the code below installs the custom spark operator that includes the cos jars to connect to cloud object storage

```cmd
$ helm install spark-operator spark-operator/spark-operator --namespace default --set sparkJobNamespace=default,enableWebhook=true --set serviceAccounts.spark.name=spark --set image.repository=127.0.0.1:30500/bizops/spark-operator --set image.tag=1.0.0

NAME: spark-operator
LAST DEPLOYED: Wed Feb  3 11:46:04 2021
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None

$ helm list

NAME            NAMESPACE  REVISION  UPDATED                               STATUS    CHART                   APP VERSION
spark-operator  default    1         2021-02-03 11:46:04.140469 +0100 CET  deployed  spark-operator-1.0.5    v1beta2-1.2.0-3.0.0

```

For upgrading it's better to uninstall the release and install the latest one.

```cmd
$ helm delete spark-operator
release "spark-operator" uninstalled
```

### helm commands

```cmd
helm delete spark-operator
helm delete --no-hooks spark-operator # using a force
helm uninstall spark-operator-uat --namespace uat
helm list --all-namespaces
```

### Shared Volume

apply the operator-claim in spark-operator folder

```cmd
$ kubectl apply -f operator-claim.yaml

persistentvolumeclaim/spark-shared-data created
```

## Running applications

You can now run spark applications.
