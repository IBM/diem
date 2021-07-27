# API Keys

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