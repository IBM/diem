<!-- markdownlint-disable MD033 -->
# Customcode

> A description on how to work with custom code in your job

## Methods

## endjob(**kwargs)

Ends the job with an optional status and log event
Every custom code has this at it's very end and will be called unless

+ either an error has occured
+ This method is called manualy

| Function             | Method                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- |
| __endjob(**kwargs)__ | Optional to end a job                                                                       |
| status               | optional<br/>Completed - optional - default<br/>Failed - optional<br/>Stopped - optional    |
| out                  | optional - string or object - default null - will be posted to the outlog                   |
| count                | optional - number - default 0 - number to be displayed in the Number field of the main page |

{.bx--data-table}

## UtcNow()

Returns the string format of the current timestamp

```python
def UtcNow():
    now = datetime.datetime.utcnow()
    return now.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'
```

## out(data)

Provides an alternative to print that create a log entry in diem

## error(error)

Custom error handler that let's the job fail and logs the error

```python
def error(err):
    print(err)
    now = time.strftime("%Y-%m-%d %H:%M:%S")

    data = {
        "email": __email,
        "error": str(err),
        "id": __id,
        "jobid": __jobid,
        "jobend": now,
        "name": __name,
        "status": "Failed"
    }
    mq(data)
    msg = f"Job {__id} failed - time: {UtcNow()} - runtime: {time.time() - start_time}"
    print(msg)
    exit(1)
```

## File Mehods

See files

### System Variables

There are a serious of system variables you can use in your job

```py
__id = '5fc536c677d005477917c89d'  # this is the id of the job
__email = 'guy_huinen@be.ibm.com' # the name of the user currently running the job
__jobid = '5fc536c677d005477917c89d' # the reference to the job id ( current job or pipeline reference)
__name = 'Sleep 1 (5)'  # The name of the job
__filepath = '/tmp/spark-local-dir'  # the path where you can store temp data
__transid = '6cd346a3-2f98-0e4c-85d9-d18d2c1caf0c' # the running reference of the job
__count = 0  # a count number that will be displayed on the etl main job page
__starttime: None
__jobstart: None
```

These variables are being exposed from the config module so you can use them as

```py
user = config.__email
```
