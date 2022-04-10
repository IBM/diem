### Mongo

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
