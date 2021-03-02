# Partitioning

> Atomic chunks of data (logical division of data) stored on a node in the Database / Cluster. Partitions are basic units of parallelism

```mermaid
graph LR
  linkStyle default interpolate basis
  S(Source)
  Q1(Query 1)
  Q2(Query 2)
  Q3(Query 3)
  Q4(Query 4)
  Q5(Query 5)
  Q6(Query 6)
  T(Target)
  S -- Load ---> Q1
  S -- Load ---> Q2
  S -- Load ---> Q3
  S -- Load ---> Q4
   S -- Load ---> Q5
  S -- Load ---> Q6
  Q1 -- Insert ---> T
  Q2 -- Insert ---> T
  Q3 -- Insert ---> T
  Q4 -- Insert ---> T
  Q5 -- Insert ---> T
  Q6 -- Insert ---> T
```

## Partitioning in spark

For correct partitiong

-lowerbound
-upperbound
-number of partitions

### ROW_NUMBER() OVER

```sql
SELECT
  ROW_NUMBER() OVER (
    ORDER BY
      BMX_FLG,
      AS_A_SERV_FLG,
      MRR_DYNMCS_FLG
  ) AS PART,
  A.*
FROM
  STAGING.DIM_OFFERG_SST A
```

### DBPARTITIONNUM()

> Use this if your database is partitioned

```sql
SELECT
  DBPARTITIONNUM(DIV_CD) AS PART,
  A.*
FROM
  STAGING.DIM_OFFERG_SST A
```

### HASKEYVALUE

> Use this if your database is well distributed

```sql
SELECT
  HASHEDVALUE(CUST_ID) AS PART,
  *
FROM
  CLOUD2.DIM_CUST_SUM
```
