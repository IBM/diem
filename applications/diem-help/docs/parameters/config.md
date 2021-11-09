<!-- markdownlint-disable MD033 -->
# Parameters for Config Overwrite -config

> This describes the usage of the parameters section in your job. For more details see the respective section.

```yaml
# Config Overwrite (Pipelines)
# In some cases you might want to overwrite the default config
config:
    source:
        connection: db2wh_etl
    target:
        connection: db2wh_prod
    stmt:
        connection: db2wh_prod

using in your code: |
The settins above will overwrite the source and target in a transfer job
It will overwrite the connection in a statement job
```
