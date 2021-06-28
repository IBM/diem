# Architecture

> This describes the general architecture of the application

## Cloud Native Example Architecture

![architecture](../../../diem-help/docs/images/architecture/architecture1.png =900x)

## Components, Containers and Packages

### Diem Core Components

| Application    | Version                  | Image                                                 |
| -------------- | ------------------------ | ----------------------------------------------------- |
| Helm           | 1.1.0                    | chart                                                 |
| Core           | 1.4.2                    | Node 16.3.0 on Alpine 3.13.5                          |
| NodePy         | 1.1.0                    | Node 14.16.0 - Python 3.9.2 on rhel 8.4               |
| Operator       | 1.0.4                    | Node 16.3.0 on Alpine 3.13.5                          |
| Help           | 1.2.0                    | Node 16.3.0 on Alpine 3.13.5                          |
| Spark Operator | v1beta2-1.2.3-3.1.1_rhel | Spark Operator 1.1.3 on rhel 8.4                      |
| Spark          | 3.1.2_rhel               | Spark 3.1.2 on rhel 8.4                               |
| PySpark        | 3.1.2_rhel               | Spark 3.1.2 - Node 14.16.0 - Python 3.9.2 on rhel 8.4 |
| Nats           | 0.8.0                    | Nats 2.2.6 on Alpine 3.13.5                           |

{.bx--data-table .bx--data-table2}

### Images Location

```cmd
>_ docker pull quay.io/diem/spark:base-spark-3.1.1 | base spark image | 3.1.1
```

| Image                       | Location                                               | version |
| --------------------------- | ------------------------------------------------------ | ------- |
| quay.io/diem/diem-core      | Diem Core                                              | latest  |
| quay.io/diem/nodepy         | Diem Nodepy                                            | latest  |
| quay.io/diem/operator       | Diem Operator Image                                    | latest  |
| quay.io/diem/diem-help      | Diem Help                                              | latest  |
| quay.io/diem/base-spark     | spark distribution image                               | latest  |
| quay.io/diem/spark          | diem spark image                                       | latest  |
| quay.io/diem/pyspark        | diem pyspark image                                     | latest  |
| quay.io/diem/spark-operator | the operator image to be used with operator helm chart | latest  |
| quay.io/diem/mongoloader    | Image for loading mongo configs                        | latest  |

{.bx--data-table .bx--data-table2}

### Python Diemlib

Use it for any local development. This package is included in nodepy and spark

Located at [https://pypi.org/search/?q=diemlib](https://pypi.org/search/?q=diemlib)

```cmd
pip install diemlib
```

### Run Times

 | Language   | Description             | Version |
 | ---------- | ----------------------- | ------- |
 | spark      | Run by spark containers | 3.1.2   |
 | python     | Run by nodepy executor  | 3.9.2   |
 | javascript | Run by nodepy executor  | 16.3    |

 {.bx--data-table .bx--data-table2}
