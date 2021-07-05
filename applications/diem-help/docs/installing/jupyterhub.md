<!-- markdownlint-disable MD033 -->
# JupyterHub for your Local Cluster

## Installing on kubernetes

There's an excellent installation descritiption [https://github.com/jupyterhub/zero-to-jupyterhub-k8s](https://github.com/jupyterhub/zero-to-jupyterhub-k8s)

## PVC

You might want to share you local drive with the jupyter hub. For that you need to create a Persistant Volume and create a claim on it.

Apply the 2 pvc's in the pvc folder

Modify the hostpath of the pv.yaml (pv_template) to point to your the local directly you want to share your data

```yml
hostPath:
    path: "/Users/yourusername/pathtoyourlocation/shared"
```

specify the size of the claim

apply this pv.yaml (pv_template) first: this will create your persistant volume

```cmd
>_ kc apply -f pv.yaml
persistentvolume/jupyter-pv configured
```

Apply the claim

```cmd
>_kc apply -f pvc.yaml
persistentvolumeclaim/jupyter-pvc-claim created
```

## values.yaml

There's a values.yaml that can be customized and that you can use to configure Jupyterhub.
it includes 3 diem related images (see further below).

Modify optionaly some values like userid and password.

The singleuser.defaultUrl: "/lab" can be any of the 2:

1. lab is the new interface
2. /tree is the classic interface
3. specify also the baseurl (jupyterhub url) you will be using in case you are using an ingress (see below).

  ```yml
  hub.baseUrl: /jupyter
  ```

## Install the chart

### Add JupyterHub

```cmd
helm repo add jupyterhub https://jupyterhub.github.io/helm-chart/
helm repo update
```

### Run the install command

specify name, namespace version and add the values file

```cmd
helm upgrade --install --cleanup-on-fail diem-jupyterhub jupyterhub/jupyterhub --namespace default --create-namespace --version=1.0.1 --values values.yaml
```

Possible return

```cmd
Release "diem-jupyterhub" does not exist. Installing it now.
NAME: diem-jupyterhub
LAST DEPLOYED: Mon Jul  5 12:50:14 2021
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Thank you for installing JupyterHub!

Your release is named "diem-jupyterhub" and installed into the namespace "default".

You can check whether the hub and proxy are ready by running:

 kubectl --namespace=default get pod

and watching for both those pods to be in status 'Running'.

You can find the internal (cluster) IP of JupyterHub by running:

  kubectl get -n default svc proxy-public -o jsonpath='{.spec.clusterIP}'

To get full information about the JupyterHub proxy service run:

  kubectl --namespace=default get svc proxy-public

If you have questions, please:

  1. Read the guide at https://z2jh.jupyter.org
  2. Ask for help or chat to us on https://discourse.jupyter.org/
  3. If you find a bug please report it at https://github.com/jupyterhub/zero-to-jupyterhub-k8s/issues
```

### Ingress

In order to view the data you might need to create or add an ingress route. In our example this looks like this

```yml
- path: /jupyter
    pathType: Prefix
    backend:
      serviceName: proxy-public
      servicePort: 80
```

## Preparing the run time images

There are 3 images available at your disposal.

In the example we are using a local docker repository "127.0.0.1:30500/jupyter" (see running diem on local)

pyspark: quay.io/diem/jupyterhub:pyspark_3.8.8_1<br/>
nodepy: quay.io/diem/jupyterhub:nodepy_3.8.8_1<br/>
experimental quay.io/diem/jupyterhub:experimental_3.8.8_1<br/>

Those are available and will be uploaded when you apply your values.yaml

To build the charts yourself using your own repository

1. build the images

    ```cmd
    # image based on diem-nodepy
    >_ npm run jupyter_nodepy

    # image based on diem-spark (pyspark)
    >_ npm run jupyter_pyspark

    # image based on diem-nodepy where you can add additional libraries
    >_ npm run jupyter_experimental
    ```

2. push the images to your local repository
3. Modify you values.yaml to incorporate these images

> The images on quay.io are build this way. If you want to push them to your image repository you can

```cmd
docker tag 127.0.0.1:30500/jupyter/jupyter-spark:latest quay.io/diem/jupyterhub:pyspark_3.8.8_1
docker tag 127.0.0.1:30500/jupyter/jupyter-nodepy:latest quay.io/diem/jupyterhub:nodepy_3.8.8_1
docker tag 127.0.0.1:30500/jupyter/jupyter-experimental:latest quay.io/diem/jupyterhub:experimental_3.8.8_1
```

## Quick start

1. Login into your local kubernetes cluster with the route specified in your ingress

    ![installing1](../../../diem-help/docs/images/installing/jupyterhub1.png =200x)

2. Select the image you want your code to run with

    ![installing2](../../../diem-help/docs/images/installing/jupyterhub2.png =600x)

3. You will be presented with the jupyterhub shell

## Extra

### Delete a pvc

```cmd
>_ kubectl get pvc
jupyter-pvc-claim

>_kubectl delete pvc
persistentvolumeclaim "jupyter-pvc-claim" deleted

#in case a volume get stuck in terminating you can try the following

kubectl patch pv {PV_NAME} -p '{"metadata":{"finalizers":null}}'
kubectl patch pvc {PVC_NAME} -p '{"metadata":{"finalizers":null}}'
```
