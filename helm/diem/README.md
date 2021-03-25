<!-- markdownlint-disable MD033 -->
# Install Diem via helm

<img alt="Helm" src="https://img.shields.io/badge/dynamic/yaml?label=helm%20chart&query=version&prefix=v&url=https://raw.githubusercontent.com/IBM/diem/gh/latest/helm/chart/Chart.yaml"/>

1. install [helm 3](https://helm.sh/docs/intro/install/)

2. Install the [quay helm Plugin](https://github.com/app-registry/quay-helmv3-plugin)

    ```cmd
    >_ helm plugin install https://github.com/app-registry/quay-helmv3-plugin

    # run this
    >_ helm quay --help
    Quay plugin assets do not exist, download them now !
    downloading https://github.com/app-registry/appr/releases/download/v0.7.4/appr-osx-x64 ...

    # other optional commands
    >_ helm quay list-plugin-versions
    >_ helm quay upgrade-plugin v0.7.4
    ```

3. Create a values.yaml file if needed and modify with your own values

4. install the chart

    ```cmd
    >_ helm quay upgrade --install quay.io/huineng/diem@0.1.0 diem -f values_local.yaml
    ```

## todo

{{ (index (lookup "v1" "Service" .Release.Namespace $service).status.loadBalancer.ingress 0).ip }}
