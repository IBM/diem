# Install Diem via helm

1. install [helm 3](https://helm.sh/docs/intro/install/)

2. Install the [quay helm Plugin](https://github.com/app-registry/quay-helmv3-plugin)

    ```cmd
    helm plugin install https://github.com/app-registry/quay-helmv3-plugin

    # other optional commands
    helm quay list-plugin-versions
    helm quay upgrade-plugin v0.7.4
    ```

3. Create a values.yaml file if needed and modify with your own values

4. install the chart

    ```cmd
    helm quay upgrade --install  quay.io/huineng/diem@0.1.0 diem -f values_local.yaml
    ```
