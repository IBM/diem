# Restfull Services for Jobs

> Provides an API interface for starting jobs from the backend

## Post Request

### Obtain an api key

This is manual yet, but will be authomated

### Configuration

make a post request to diem-dev.mybluemix.net

! API is an example and not a real one

```yaml
endpoint: [https://diem-dev.mybluemix.net/etl-mgr/api/apijob](https://diem-dev.mybluemix.net/etl-mgr/api/apijob)
apik_value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImxlYXBAaWJtLmNvbSIsIm5hbWUiOiJMZWFwIEFwaSIsImlkIjoiMjE0YWNhZTAtZTVjMC1iNzQzLWI1MjUtMDJlM2ZlM2ViOTVkIiwib3JnIjoibGVhcCIsImJsdWVHcm91cHMiOlsiYWxsIl0sInVpZCI6ImxlYXAiLCJpYXQiOjE2MDgwNTYwMTN9._PxC62evC7oJE6U_-hMjgdkfjdskfdkljajdkakfhdkhfak
api_token: x-api-key
method: json
body: {"id":"5fd3a340b15cc4d3b71b7cc7"}
```

Id is the name of your job

```shell
curl --location --request POST 'https://diem-dev.mybluemix.net/etl-mgr/api/apijob' \
--header 'x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImxlYXBAaWJtLmNvbSIsIm5hbWUiOiJMZWFwIEFwaSIsImlkIjoiMjE0YWNhZTAtZTVjMC1iNzQzLWI1MjUtMDJlM2ZlM2ViOTVkIiwib3JnIjoibGVhcCIsImJsdWVHcm91cHMiOlsiYWxsIl0sInVpZCI6ImxlYXAiLCJpYXQiOjE2MDgwNTYwMTN9._PxC62evC7oJE6U_-hMjgdkfjdskfdkljajdkakfhdkhfak' \
--header 'Content-Type: application/json' \
--data-raw '{"id":"5fd3a340b15cc4d3b71b7cc7"}'
```

### Python

```python
import requests

url = "https://diem-dev.mybluemix.net/etl-mgr/api/apijob"

payload="{\"id\":\"5fd3a340b15cc4d3b71b7cc7\"}"
headers = {
  'x-api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImxlYXBAaWJtLmNvbSIsIm5hbWUiOiJMZWFwIEFwaSIsImlkIjoiMjE0YWNhZTAtZTVjMC1iNzQzLWI1MjUtMDJlM2ZlM2ViOTVkIiwib3JnIjoibGVhcCIsImJsdWVHcm91cHMiOlsiYWxsIl0sInVpZCI6ImxlYXAiLCJpYXQiOjE2MDgwNTYwMTN9._PxC62evC7oJE6U_-hMjgdkfjdskfdkljajdkakfhdkhfak',
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
  url: 'https://diem-dev.mybluemix.net/etl-mgr/api/apijob',
  headers: {
    'x-api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImxlYXBAaWJtLmNvbSIsIm5hbWUiOiJMZWFwIEFwaSIsImlkIjoiMjE0YWNhZTAtZTVjMC1iNzQzLWI1MjUtMDJlM2ZlM2ViOTVkIiwib3JnIjoibGVhcCIsImJsdWVHcm91cHMiOlsiYWxsIl0sInVpZCI6ImxlYXAiLCJpYXQiOjE2MDgwNTYwMTN9._PxC62evC7oJE6U_-hMjgdkfjdskfdkljajdkakfhdkhfak',
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
  .url("https://diem-dev.mybluemix.net/etl-mgr/api/apijob")
  .method("POST", body)
  .addHeader("x-api-key", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImxlYXBAaWJtLmNvbSIsIm5hbWUiOiJMZWFwIEFwaSIsImlkIjoiMjE0YWNhZTAtZTVjMC1iNzQzLWI1MjUtMDJlM2ZlM2ViOTVkIiwib3JnIjoibGVhcCIsImJsdWVHcm91cHMiOlsiYWxsIl0sInVpZCI6ImxlYXAiLCJpYXQiOjE2MDgwNTYwMTN9._PxC62evC7oJE6U_-hMjgdkfjdskfdkljajdkakfhdkhfak")
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
