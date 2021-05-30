# Restfull Services for Jobs

> Provides an API interface for starting jobs from the backend

## Post Request

### Obtain an api key

From the Integrations section, select Api Keys

![files3](../../../diem-help/docs/images/integrations/apikeys1.png =150x)

Create a new API Key

![files3](../../../diem-help/docs/images/integrations/apikeys2.png =150x)

Fill in all fields, optional add additional fields to be included in the api

![files3](../../../diem-help/docs/images/integrations/apikeys3.png =800x)

You can preview the api key

![files3](../../../diem-help/docs/images/integrations/apikeys4.png =800x)

You api key will look like this

```txt
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiJwb3N0bWFuIiwidWlkIjoiZGllbV9hcGkiLCJvcmciOiJ0ZXN0IiwiaWQiOiIzNmQyMzAwNy0wZGE0LWViZmUtZmQzZS0wZDhjMjdmYWFmYWUiLCJpYXQiOjE2MjIwMTk3Nzl9.oZXeMb3je2mDT7vOT9d-8g76lKABdA3qdxzoVUDDHKY # pragma: allowlist secret
```

You api key will look like this decoded

```json
{
  "app": "postman",
  "uid": "diem_api",
  "org": "test",
  "id": "36d23007-0da4-ebfe-fd3e-0d8c27faafae",
  "iat": 1622019779
}
```

### Usuage

make a post request to your diem instance diem-instance.com


```yaml
endpoint: [https://diem-instance.com/etl-mgr/api/apijob](https://diem-instance.com/etl-mgr/api/apijob)
apik_value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.  eyJhcHAiOiJwb3N0bWFuIiwidWlkIjoiZGllbV9hcGkiLCJvcmciOiJ0ZXN0IiwiaWQiOiIzNmQyMzAwNy0wZGE0LWViZmUtZmQzZS0wZDhjMjdmYWFmYWUiLCJpYXQiOjE2MjIwMTk3Nzl9.oZXeMb3je2mDT7vOT9d-8g76lKABdA3qdxzoVUDDHKY # pragma: allowlist secret
api_token: x-api-key
method: json
body: {"id":"5fd3a340b15cc4d3b71b7cc7"}
```

Id is the name of your job

```shell
curl --location --request POST 'https://diem-instance.com/etl-mgr/api/apijob' \
--header 'x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiJwb3N0bWFuIiwidWlkIjoiZGllbV9hcGkiLCJvcmciOiJ0ZXN0IiwiaWQiOiIzNmQyMzAwNy0wZGE0LWViZmUtZmQzZS0wZDhjMjdmYWFmYWUiLCJpYXQiOjE2MjIwMTk3Nzl9.oZXeMb3je2mDT7vOT9d-8g76lKABdA3qdxzoVUDDHKY' \ # pragma: allowlist secret
--header 'Content-Type: application/json' \
--data-raw '{"id":"5fd3a340b15cc4d3b71b7cc7"}'
```

### Python

```python
import requests

url = "https://diem-instance.com/etl-mgr/api/apijob"

payload="{\"id\":\"5fd3a340b15cc4d3b71b7cc7\"}"
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
