<!-- markdownlint-disable MD033 -->
# Parametes for Spark -spark

> This describes the usuage of the parameters section in your job. For more details see the respective section.

In certain circumstances you can overwrite the default spark capacity allocartion. this is mostly the case for...

- when running local ( use driver settings)
- large jobs (large data) - increase if needed executor memory

```yaml
spark:
    local: 5 # run in local mode on driver
    driver:
        cores: 10
        memory: 8G
    executor:
        cores: 5 #number of cores
        memory: 8G # memory allocated
        instances: 2 #number of instances
```

Memory is measured in bytes. In addition, it may be used with SI suffices (E, P, T, G, M, K)
Runs a custom spark file with 5 CPU
