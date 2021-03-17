<!-- markdownlint-disable MD033 -->
# Parameters for Pipelines -pipeline

> This describes the usuage of the parameters section in your job. For more details see the respective section.

## Introduction

Parameters are driven by flags, following are the current possibilities

```yml
pipeline:
    passdown:
        - connections
        - slack
        - files
        - configmaps
        - spark
        - mail
```
