<!-- markdownlint-disable MD033 -->
# Parametes for Spark -spark

> This describes the usuage of the parameters section in your job. For more details see the respective section.

In certain circumstances you can overwrite the default spark capacity allocartion. this is mostly the case for...

- when running local ( use driver settings)
- large jobs (large data) - increase if needed executor memory

# Running on local (execution is done on the driver)

```yaml
spark:
    local: true # specify to run on local
    executor:
        cores: 5 #number of cores
        memory: 8g # memory allocated
```

# Running with spark executors (execution is done via one or more executors)

```yaml
spark:
    driver:
        cores: 2 # specify the number of cores: default 1
        memory: 2g # specify the memory: default 1024m
    executor:
        cores: 5 # number of executor cores
        memory: 8g # memory allocated to the executor
        instances: 2 # number of instances
```

Runs a custom spark file with 5 CPU on 2 executor with 1 driver

Memory is measured in bytes. In addition, it may be used with SI suffices (e, p, t, g, m, k)