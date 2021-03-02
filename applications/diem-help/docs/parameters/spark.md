<!-- markdownlint-disable MD033 -->
# Parametes for Spark -spark

> This describes the usuage of the parameters section in your job. For more details see the respective section.

In certain circumstances we can overwrite the default spark capacity allocartion. this is mostly the case

- when running local ( use driver settings)
- large jobs (large data) - increase if needed executor memory

```yaml
spark:
    driver:
        cores: 10
        memory: 8G
    executor:
        memory: 8G
    instances: 2 # only for custom jobs, will run in executor
```

Memory is measured in bytes. In addition, it may be used with SI suffices (E, P, T, G, M, K)
Runs a custom spark file with 5 CPU
