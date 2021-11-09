# Restfull Services for Jobs

## API Key

In order to use these restfull services you must first create an API Key as described here [Creating API Keys](../int_apikeys)

## Usage

make a post request to your diem instance diem-instance.com

```yaml
endpoint: [https://diem-instance.com/etl-mgr/api/apijob](https://diem-instance.com/etl-mgr/api/apijob)
header_key: x-api-key
header_value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiJwb3N0bWFuIiwidWlkIjoiZGllbV9hcGkiLCJvcmciOiJ0ZXN0IiwiaWQiOiIzNmQyMzAwNy0wZGE0LWViZmUtZmQzZS0wZDhjMjdmYWFmYWUiLCJpYXQiOjE2MjIwMTk3Nzl9.oZXeMb3je2mDT7vOT9d-8g76lKABdA3qdxzoVUDDHKY # pragma: allowlist secret
method: json
body: {"id":"5fd3a340b15cc4d3b71b7cc7","action": "status"}
```

## Possible actions

```txt
"action": "status" : displays the status of your job
"action": "start": starts a job with id
"action": "stop": stops a job with id
```

Id is the name of your job

```shell
curl --location --request POST 'https://diem-instance.com/etl-mgr/api/apijob' \
--header 'x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiJwb3N0bWFuIiwidWlkIjoiZGllbV9hcGkiLCJvcmciOiJ0ZXN0IiwiaWQiOiIzNmQyMzAwNy0wZGE0LWViZmUtZmQzZS0wZDhjMjdmYWFmYWUiLCJpYXQiOjE2MjIwMTk3Nzl9.oZXeMb3je2mDT7vOT9d-8g76lKABdA3qdxzoVUDDHKY' \ # pragma: allowlist secret
--header 'Content-Type: application/json' \
--data-raw '{"id":"5fd3a340b15cc4d3b71b7cc7","action": "status"}'
```

### Python

```python
import requests

url = "https://diem-instance.com/etl-mgr/api/apijob"

payload="{\"id\":\"5fd3a340b15cc4d3b71b7cc7\",\"action\": \"status\"}"
headers = {
  'x-api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiJwb3N0bWFuIiwidWlkIjoiZGllbV9hcGkiLCJvcmciOiJ0ZXN0IiwiaWQiOiIzNmQyMzAwNy0wZGE0LWViZmUtZmQzZS0wZDhjMjdmYWFmYWUiLCJpYXQiOjE2MjIwMTk3Nzl9.oZXeMb3je2mDT7vOT9d-8g76lKABdA3qdxzoVUDDHKY', # pragma: allowlist secret
  'Content-Type': 'application/json',
  'Cookie': '2dde790f4336c48096c854e78a2bf377=8e7fbffd3054f98246f64722461a3275'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)

```

### Javascript

```javascript
var axios = require('axios');
var data = JSON.stringify({"id":"5fd3a340b15cc4d3b71b7cc7"});

var config = {
  method: 'post',
  url: 'https://diem-instance.com/etl-mgr/api/apijob',
  headers: {
    'x-api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiJwb3N0bWFuIiwidWlkIjoiZGllbV9hcGkiLCJvcmciOiJ0ZXN0IiwiaWQiOiIzNmQyMzAwNy0wZGE0LWViZmUtZmQzZS0wZDhjMjdmYWFmYWUiLCJpYXQiOjE2MjIwMTk3Nzl9.oZXeMb3je2mDT7vOT9d-8g76lKABdA3qdxzoVUDDHKY', # pragma: allowlist secret
    'Content-Type': 'application/json',
    'Cookie': '2dde790f4336c48096c854e78a2bf377=8e7fbffd3054f98246f64722461a3275'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
});
```

### Java

```java
OkHttpClient client = new OkHttpClient().newBuilder()
  .build();
MediaType mediaType = MediaType.parse("application/json");
RequestBody body = RequestBody.create(mediaType, "{\"id\":\"5fd3a340b15cc4d3b71b7cc7\"}");
Request request = new Request.Builder()
  .url("https://diem-instance.com/etl-mgr/api/apijob")
  .method("POST", body)
  .addHeader("x-api-key", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiJwb3N0bWFuIiwidWlkIjoiZGllbV9hcGkiLCJvcmciOiJ0ZXN0IiwiaWQiOiIzNmQyMzAwNy0wZGE0LWViZmUtZmQzZS0wZDhjMjdmYWFmYWUiLCJpYXQiOjE2MjIwMTk3Nzl9.oZXeMb3je2mDT7vOT9d-8g76lKABdA3qdxzoVUDDHKY") # pragma: allowlist secret
  .addHeader("Content-Type", "application/json")
  .addHeader("Cookie", "2dde790f4336c48096c854e78a2bf377=8e7fbffd3054f98246f64722461a3275")
  .build();
Response response = client.newCall(request).execute();
```

### About

The api is a Json Web Token (JWT) and contains following details

```json
{
  "email": "myapp@ibm.com",
  "name": "Leap Api",
  "id": "2154acae0-e5c0-b743-b52-0dfdsusdi9eb95d",
  "org": "leap",
  "blueGroups": [
    "all"
  ],
  "uid": "leap",
  "iat": 1608056013
}
```
