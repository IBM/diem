# Spark-Images

Documentation is located in the docs directory

## TLDR

```cmd
# check package for updates (requires pip-upgrade)
pip-upgrade --dry-run --skip-package-installation requirements-3.1.2.txt
pip-upgrade --dry-run --skip-package-installation requirements-3.2.0.txt
# spark image rhel
docker build -t quay.io/diem/spark:3.1.2_rhel -f images/Dockerfile.spark-3.1.2_rhel .
docker build -t quay.io/diem/spark:3.2.0_rhel -f images/Dockerfile.spark-3.2.0_rhel .
# pyspark image rhel
docker build -t quay.io/diem/pyspark:3.1.2_rhel -f images/Dockerfile.pyspark-3.1.2_rhel .
docker build -t quay.io/diem/pyspark:3.2.0_rhel -f images/Dockerfile.pyspark-3.2.0_rhel .
```
