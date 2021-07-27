# Box Connection

> Box integration (Box Info) [https://w3.ibm.com/help/#/article/use_box/overview](https://w3.ibm.com/help/#/article/use_box/overview)

## Using the Box diemlib library

```yaml
# paramaters
slack:
  disabled: true
configmaps:
  - sysadmin_box_diem
```

```py
# import the diemlib box library
from diemlib.box import Box

# create a box instance
box = Box(sysadmin_box_diem)

# get the file into a dataframe
df = box.readFile('774538313613')

# print as html
out(df.to_html())

# create a new file from a datframe and upload to box
newfile = 'out.csv'
folder = '126161133114'
response = box.saveFile(df,newfile,folder)

# print the result
out(response)
```

### Remarks

- You need to give access to the diem application add xxxxxx@boxdevedition.com
- you need to know the id of the file (open the file and look at the url)
- you need to know the name of the folder (open the ffolder and look at the url)

## Developing Box Applications

### Create a personal account

read the instructions [https://ibm.ent.box.com/v/Dev4Box](https://ibm.ent.box.com/v/Dev4Box)

### Create an application

- Go to [https://developer.box.com/](https://developer.box.com/)
- Select JWT
- make sure you have 2 factor authentication enabled to generate key pair
- Enable key pair
- Make sure "Write all files and folders stored in Box" is enabled

Submit your application Application

For development:

- Go to your admin console in BOX
- In Apps? Custom Apps , approve the application (you will get an email)

For Production

- Make a request [Box@IBM Allowlist Request](https://w3.ibm.com/tools/cio/forms/secure/org/app/6629349b-2dfe-4435-846f-6e8133f5360f/launch/index.html?form=F_Form1)
- Fill in a fields
- Submit

## Testing your code

### Installing an preparing

- Pip install the SDK

```python
pip install boxsdk[jwt]
```

- Download your credentials (will open as json)

```python
auth = {
  "boxAppSettings": {
    "clientID": "yourclientid",
    "clientSecret": "yourclientsecret",
    "appAuth": {
      "publicKeyID": "yourpublicKeyID",
      "privateKey": "yourprivateKey",
      "passphrase": "yourpassphrase"
    }
  },
  "enterpriseID": "yourenterpriseid"
}
```

- Create client

```python
from boxsdk import JWTAuth, Client
config = JWTAuth.from_settings_dictionary(auth)
client = Client(config)
```

- Get Some client information

```python
user = client.user().get()

# Print the name of the current user
print(user.name)

# this will print all the properties
print(user.__dict__)
```

### Reading Files

#### Service (App) Email

In Order to read files the service account (app) needs to be given access to a file or folder

- Find the email of the app (service id)

```py
out(user.login)

AutomationUser_something@boxdevedition.com
```

- Use this userid and add this user as a collaborator ( read write )

#### Getting a file id

- I have not found any other way other then to open the file and to get the fileid from the url

```py
file_id = '776846379598'
file_info = client.file(file_id).get()
out(f"File {file_info.name} has a size of {file_info.size} bytes")

File org.csv has a size of 1324 bytes
```

- Get the binary data and convert to pandas dataframe

```py
file_content = client.file(file_id).content()
from io import StringIO
import pandas as pd

s=str(file_content,'utf-8')

data = StringIO(s)

df=pd.read_csv(data)
```

## Documentation

Api Calls : [https://developer.box.com/reference/](https://developer.box.com/reference/)
Python SDK Github: [https://github.com/box/box-python-sdk](https://github.com/box/box-python-sdk)
