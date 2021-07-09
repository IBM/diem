# Execution Flow

> This describes the way jobs are being executed

## Nodepy

```mermaid
graph TD
  U1((User))
  U2((User))
  N1(Node)
  N2(Node)
  N3(Node)
  N4(Node)
  N5(Node)
  N6(Node)
  N7(Node)
  N8(Node)
  N9(Node)
  R1(Nats)
  U1 -->|Job Start| N1
  U1 -.- N2
  U1 -.- N3
  N1 --> C{{Prepare File}}
  C -->|Run Code| D[Python]
  D -.- N4
  D -.- N5
  D -->|Publish| N6
  N6 -->|Broadcast| R1
  R1 <--> N7
  R1 <-->|Subscribe| N8
  R1 <--> N9
  N8 -->|Results| U2
  linkStyle 1 display:none;
  linkStyle 2 display:none;
  linkStyle 6 display:none;
  linkStyle 5 display:none;
  ```

## Spark

### High Level flow

A Job is being executed from Diem, which creates a k8 crd that is sent to the spark-operator which in turn creates a spark-application (driver and executors)

![spark](../../../diem-help/docs/images/architecture/execution_spark.png =900x)

### Detailed flow

 ```mermaid
  graph TD
  U1((User))
  U2((User))
  N1(Node)
  N2(Node)
  N3(Node)
  N4(Node)
  N5(Node)
  N6(Node)
  N7(Node)
  N8(Node)
  N9(Node)
  P1(Spark Driver)
  P2(Spark Executor)
  R1(Nats)
  U1 -->|Job Start| N1
  U1 -.- N2
  U1 -.- N3
  N1 --> C{{Prepare File}}
  C -->|Schedule| D[Spark Operator]
  D -->|Run Code| P1
  P1 -.-> P2
  P1 -.- N4
  P1 -.- N5
  P1 -->|Callback| N6
  N6 -->|Broadcast| R1
  R1 <--> N7
  R1 <-->|Subscribe| N8
  R1 <--> N9
  N8 -->|Results| U2
  linkStyle 1 display:none;
  linkStyle 2 display:none;
  linkStyle 7 display:none;
  linkStyle 8 display:none;
```

## Messages in Nats

### local

| Route      | Description                    |
| ---------- | ------------------------------ |
| core.info  | info to single core worker     |
| core.error | Error message to single worker |

{.bx--data-table .bx--data-table2}

### global

| Route             | Description                  |
| ----------------- | ---------------------------- |
| global.core.info  | info to all core workers     |
| global.core.error | Error message to all workers |
| global.core.user  | Message to user              |

{.bx--data-table .bx--data-table2}
