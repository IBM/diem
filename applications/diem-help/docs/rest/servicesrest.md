# Restfull Service for (Serverless) Service Jobs

> Service Jobs are jobs executed with the only purpose of returning data to the caller, unlike job services the return data and can be provided parameters

## API Key

In order to use these restfull services you must first create an API Key as described here [Creating API Keys](../int_apikeys)

## EndPoint

{host}/{path}/api/services
where host is your normal url example.com
where path is the name under which diem is running eg .. etl-mgr
where /api/services is your path extention

## Headers

In order to make a valid request you need a header KEY called x-api-key with the value of your api key

eg.

```curl
x-api-key: eyfksdhfzhfzehsdklsqdkl242jk4k32k423
```

## Serverless Service Job

A serverless Job is a custom job written in python or javascript.

There is no real difference between a regular job and a serverless function except

- a service job must be handled within the browser timeout. That means service jobs may not be long running
- a service job can only return once. Unlike regular jobs that can stream output or have multiple output logs, a service job can only have one return.
- a service job will wait until the job is finished and the return value is given. Not having a return value, will yield a timeout
- **A service job can contain multiple functions**
- A service job accepts arguments passed in by the caller

## Example

### Objectives

We will create service job (in javascript) that will return a random string to the user based on a optional parameter that we will provide

### Create the service job

```js
/*jshint esversion: 6 */


const randstring = (length = 8, options = '') => {
    let str = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    if (options && options.toUpperCase().includes('S')) {
        str = str + options;
    }
    return Array(Number(length))
        .fill(str)
        .map((x) => x[Math.floor(Math.random() * x.length)])
        .join('')
        .split('')
        .sort(() => 0.5 - Math.random())
        .join('');
};



const methods = {
    randstring,
};

const args = process.argv[2]; // always the second

if (!args) {
    return out("No args given");
}

let params = {};

try {
    params = JSON.parse(args);
} catch (err) {
    return out(err);
}

if (!params.action) {
    return out("no action given, please add one");
}

const action = params.action;

if (methods[action]) {

    let args = []

    if(params.args) {
        args === params.args
    }


    let res;

    try {
      // the ...args is destructering the array
      res = methods[action](params.payload, ...args)
      return out(res);
    } catch(err) {
      return out(err.message)
    }


} else {
    return out(`unknow action ${action}`);
}
```

- There is some generic code that parses the arguments
- There is an object that can hold multiple functions, so that you can create multiple functions for document
- As you can see there's only one out given, this is the final return value

## Post Request

Required format with no parameters send

Id is always required, you can copy that easily from the job you created

```json
{
  "id": "602fceba28aa3c3de457a85c",
}
```

### Passing parameters

Passing parameters is optional but in case you use it the example given provides 2 values

- the action: so that you can call multiple functions within the serverless function
- the payload: these are values that can passed to the functions. This can be any kind of object

```json
{
  "id": "602fceba28aa3c3de457a85c",
  "params": {
      "action": "randstring",
      "payload": 16
  }
}
```

## Return Values

In case the return is valid json, json will be returned

In case the response is a string , the response will be the value of the dat object

```json
{
    "out": "SayzCPNt9l5YFve2",
    "id": "60b5219d555eb079f59f4796",
    "jobid": "60b5219d555eb079f59f4796",
    "transid": "33a163c0123cfd76ec3bef4c9a4916a7",
    "email": "guy_huinen@be.ibm.com",
    "name": "SERVICES - SLACK UTIL - JAVASCRIPT"
}
```

## Status Codes

```json
{
    "message": "Service Unavailable",
    "status": 503
}
```

## Code examples

```curl
curl --location --request POST 'https://bizops.ibm.com/etl-mgr/api/services' \
--header 'x-api-key: eyHjdfqdsjfkldsjk6797kdshHKhlkhe' \
--header 'Content-Type: application/json' \
--data-raw '{
  "id": "60b5219d555eb079f59f4796",
  "params": {
      "action": "randstring",
      "payload": 16
  }
}'
```

```js
var request = require('request');
var options = {
  'method': 'POST',
  'url': 'https://bizops.ibm.com/etl-mgr/api/services',
  'headers': {
    'x-api-key': 'eyHjdfqdsjfkldsjk6797kdshHKhlkhe',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "id": "60b5219d555eb079f59f4796",
    "params": {
      "action": "randstring",
      "payload": 16
    }
  })

};
request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});
```

```python
import requests
import json

url = "https://bizops.ibm.com/etl-mgr/api/services"

payload = json.dumps({
  "id": "60b5219d555eb079f59f4796",
  "params": {
    "action": "randstring",
    "payload": 16
  }
})
headers = {
  'x-api-key': 'eyHjdfqdsjfkldsjk6797kdshHKhlkhe',
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)
```