# Restfull Service for (Serverless) Service Jobs

> Service Jobs are jobs executed with the only purpose of returning data to the caller, unlike job services the return data and can be provided parameters

## Post Request

Required format with no parameters send

Id is always required

```json
{
  "id": "602fceba28aa3c3de457a85c",
}
```

```json
{
  "id": "602fceba28aa3c3de457a85c",
  "params": {
      "params1": 123,
      "params2": "testvalue"
  }
}
```

## Return Values

In case the return is valid json, json will be returned

In case the response is a string , the response will be the value of the dat object

services.file

```py
print('This is code from the services file',end='')
```

response

```json
{
    "data": "This is code from the services file"
}
```

## Status Codes

```json
{
    "message": "Service Unavailable",
    "status": 503
}
```
