<!-- markdownlint-disable MD033 -->

# Parameters for File Option -files

> This feature can be used in nodepy and spark custom job

## Enabling and Including

### Enable without any other options

Enable the files module in the params section of the custom Job, it is by default enabled if you are using other parameters

```yml
files: true
```

### Enable and use other (Optional) options

```yml
files:
 cos: nameofcos
 bucket: bucketname
 loadfiles_type: 'string'
 loadfiles:
  file1: testfile1
  file2: testfile2
  file3: testfile3
```

#### Custom Storage Options (cos)

For the moment we support IBM Cloud objecy storage (s3 compatible)

```yml
files:
 cos: configmapname
```

Provide the name of the _configmap_ that contains your custom Object storage location. See config map for more.

Your config map needs to have the exact params to allow successfull connection.
Not providing the right values will have the connection to fail.

```yml
# for IBM Cos
apiKeyId: "api_keyxxxxx"
serviceInstanceId : "a5d4c9-9666-6efa5d4c9d26"
endpointl: "s3.us-east.cloud-object-storage.appdomain.cloud" # don't add https://
bucket: 'The Name Of the Bucket
```

Gather required information
The following variables appear in the examples:

- bucket_name must be a unique and DNS-safe string. Because bucket names are unique across the entire system, these values need to be changed if this example is run multiple times. Note that names are reserved for 10 - 15 minutes after deletion.
- ibm_api_key_id is the value found in the Service Credential as apikey.
- ibm_service_instance_id is the value found in the Service Credential as resource_instance_id.
- endpoint_url is a service endpoint URL, inclusive of the https:// protocol. This value is not the endpoints value that is found in the Service Credential. For more information about endpoints, see Endpoints and storage locations.
- LocationConstraint is a valid [provisioning code](https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-classes#classes-locationconstraint) that corresponds to the endpoint value.

#### Specify a default bucket

You can overwrite the default bucket and specify a custom one (if it exists)

```yml
files:
 bucket: diferentbucketname
```

## Custom Methods that can be used with the code

### General COS Functions for getting and saving files to cos

```py
cos.getFile(file, **kwargs)
cos.loadile(file)
cos.download(file, otherfile)
cos.readString(file)
cos.saveFile(file_name, file_body, **kwargs)
```

### cos.getFile(file, \*\*kwargs)

Reads a file from Cloud Object Storage and returns a pandas dataframe

| Function                      | Method    |
| ----------------------------- | --------- |
| **getFile(file, \*\*kwargs)** |           |
| file                          | file name |
| \*\*kwargs                    | optional  |

{.cds--data-table}

```py
df = cos.getFile('testfile')
df.head()
```

### cos.loadFile(file)

Reads a file from Cloud Object Storage and return as bytes Object

| Function          | Method    |
| ----------------- | --------- |
| **loadile(file)** |           |
| file              | file name |

{.cds--data-table}

```py
# saves a cos file to local disk
file_name = 'testfile.csv'
bytes = cos.loadFile(file_name)
f = open(file_name, "wb")
f.write(bytes.getbuffer())
f.close()
```

### cos.download(file,otherfile)

Reads a file from Cloud Object Storage and return as bytes Object

| Function                      | Method                    |
| ----------------------------- | ------------------------- |
| **download(file, otherfile)** |                           |
| file                          | file name                 |
| otherfile                     | Option, file name to save |

{.cds--data-table}

```py
# saves a cos file to local disk
file_name = 'testfile.csv'
file_tosave_name = 'newfile.csv'
cos.download(file_name,file_tosave_name)
```

### cos.readString(file)

Reads a file from Cloud Object Storage and return the content as a string

| Function             | Method    |
| -------------------- | --------- |
| **readString(file)** |           |
| file                 | file name |

{.cds--data-table}

```py
# saves a cos file to local disk
file_name = 'testfile.csv'
_string = cos.readString(file_name)
print(_string)
# this should print a string
```

### cos.saveFile(file_name, file_body, \*\*kwargs)

Reads a file from Cloud Object Storage

| Function                                       | Method                               |
| ---------------------------------------------- | ------------------------------------ |
| **saveFile(file_name, file_body, \*\*kwargs)** |                                      |
| file_body                                      | Content<br/>None in case of filename |
| \*\*kwargs                                     | optional<br/>file: filename          |

{.cds--data-table}

```info
**kwargs: file if absent the name and location of the file is the file_name
```

### Preloading of files

You can preload files (only done when code executes) by specifying which files you would like to preload

```yml
files:
 loadfiles_type: 'string'
 loadfiles:
  file1: testfile1
  file2: testfile2
  file3: testfile3
```

| Function       | Method                                                                               |
| -------------- | ------------------------------------------------------------------------------------ |
| loadfiles      | Array of files that map to a key                                                     |
| loadfiles_type | optional<br/>type of return from load event .. data is loaded as string or as pandas |

{.cds--data-table}

#### Example

```yml
files:
 loadfiles_type: 'string'
 loadfiles:
  myfile1: revenue.txt
```

this will put a varibale in your code that will download your file as string into that variable

```py
__dimdiv= cos.readString('DIM_DIV.csv')
```

You can now put in your code the variable

```sql
SELECT * FROM   cloud2.dim_div Where   div_cd in :myfile1
```

wich will finaly translate in the executed code as

```py
sql = f"""SELECT * FROM cloud2.dim_div Where div_cd in {__dimdiv}"""
```

## Other file functions

### Local file conversion using savePandas

savePandas is a diemlib method included when you specify files options. When no file options are used you can still use it by loading it from the diemlib

```py
from diemlib.filehandler import savePandas
```

### savePandas(filename, dataframe)

Reads a file from Cloud Object Storage

| Function                                  | Method             |
| ----------------------------------------- | ------------------ |
| **savePandas(file, filename, dataframe)** |                    |
| filename                                  | the file name      |
| dataframe                                 | a pandas dataframe |

{.cds--data-table}

Following methods ar supported

```py
  if file_type == ".json":
      df.to_json(filename)
  elif file_type == ".pickle":
      df.to_pickle(filename)
  elif file_type == ".parquet":
      df.to_parquet(filename)
  elif file_type == ".xlsx":
      df.to_excel(filename, sheet_name="Sheet_name_1")
  elif file_type == ".html":
      df.to_html(filename)
  elif file_type == ".csv":
      df.to_csv(filename)
  else:
      df.to_csv(filename)
  return
```

<i class="fas fa-info c-green mgr-5"></i>If you want to save it as an xls you need to install the additional pip package openpyxl

```yml
pip:
 - openpyxl
```

## Examples

```python
out(str(dir()))

# Get you test file from cloud object storage
f = 'org.csv'

# get a dilew from cos
df = cos.getFile(f)
mq({"out":f"file {f} loaded"})


# save the local file using diemlib savePandas
f5 = 'test1.xlsx'
savePandas(f5,df)
cos.saveFile(f5)
mq({"out":f"file {f5} saved in cos"})

# save the file locally with name test1.csv
# this file will only be saved locally for the session
f0 = 'test1.csv'
df.to_csv(f0, index=False)
mq({"out":f"file {f0} saved locally"})

# save the file test1.csv as test2.csv in cloud object storage
f1 = 'test2.csv'
cos.saveFile(f1,None,file=f0)
mq({"out":f"file {f1} saved in cos"})

# save some content in cloud object storage as test3.csv
f2 = 'test3.csv'
cos.saveFile(f2,"This is a test for a log item")
mq({"out":f"file {f2} saved in cos"})

# Saving as Pickle

f3 = 'test1.pickle'
df.to_pickle(f3)
cos.saveFile(f3)
mq({"out":f"file {f3} saved in cos"})

# reading pickly
html = cos.getFile(f3)[:2].to_html()
out(html)

# Saving as Parquet
f4 = 'test1.parquet'
df.to_parquet(f4)
cos.saveFile(f4)
mq({"out":f"file {f4} saved in cos"})

# reading parquet
html = cos.getFile(f4)[:2].to_html()
out(html)
```

### Example 2 Select into file

#### Parameters

```yml
connections:
 - db2wh_etl
slack:
 disabled: true
files: true
```

#### Custom Code

```yml
#jaydebeapi is needed for making a connection to the source
# set up the source in the parameters section
import jaydebeapi

# pandas is already included when files is enabled
# import pandas as pd

# make a connection
conn = jaydebeapi.connect("com.ibm.db2.jcc.DB2Driver",":db2wh_etl_jdbc",[':db2wh_etl_user',':db2wh_etl_password'])

# Adapt your sql to get the desired data
sql="SELECT div_cd from cloud2.dim_div"

# Name your output file
filename = 'DIM_DIV.csv'

# load the file
df = pd.read_sql(sql, conn)

# !! construct your sql list
values = "(" + ",".join(str(val)[1:-1] for val in df.values.tolist()) + ")"

# save the file
cos.saveFile(f"{filename}",values)

#confirm file is saved
data = {
    "out": f"file {filename} saved"
}
mq(data)
```
