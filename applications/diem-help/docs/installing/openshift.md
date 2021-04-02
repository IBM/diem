# Installing Diem on Openshift

## provision an openshift cluster

### install some dependencies

```cmd
# install some cli tools from ibm
curl -sL https://ibm.biz/idt-installer | bash

# the openshift cli
brew install openshift-cli
```

Copy the token

```txt
Browse to the OpenShift console by using the button below. From the dropdown menu in the upper right of the page, click Copy Login Command. Paste the copied command in your local terminal.
```

## Installing Diem

### Get some environmental variables

1. note down the Cluster ID from the Cluster Resources Page eg. jfkldhjkqJLKdff

2. login into ibm cloud

   ```cmd
   >_ ibmcloud login --sso
   ```

3. Get the ingress token

    ```cmd
    >_ibmcloud oc cluster get --cluster jfkldhjkqJLKdff | grep Ingress

    Ingress Secret:         mycluster-<hash>-0000
    ```

4. copy that secret to your namespace

    ```cmd
    # The Ingress controller can access TLS secrets only in the same project that the Ingress
    # resource is deployed to. If your app is deployed in a project other than openshift-ingress,
    # you must copy the default TLS secret from openshift-ingress to that project.

    >_ ibmcloud oc ingress secret get -c <cluster> --name <secret_name> --namespace openshift-ingress

    crn:v1:bluemix:public:cloudcerts:edskdhfkqdhfqdhfjkq

    # create a new secret for your namespace
    # important use the same namespace as you will set up diem
    # use the same tls name as in the helm values eg.. diem-tls-secret

    >_ ibmcloud oc ingress secret create --cluster <cluster_name_or_ID> --cert-crn <CRN> --name <secret_name> --namespace project
    ```

### Install Diem using the helm chart

```cmd
>- helm quay upgrade --install quay.io/huineng/diem@0.1.4 diem -f values_local.yaml
```
