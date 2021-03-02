# Github Integration

> How to connect Diem to github using PyGithub [https://github.com/PyGithub/PyGithub](https://github.com/PyGithub/PyGithub)

## Documentation on API

[https://pygithub.readthedocs.io/en/latest/](https://pygithub.readthedocs.io/en/latest/)

## Add Library

For Development

```py
pip install PyGithub
```

In Diem

```yml
pip:
  - PyGithub
```

## Get Content of a file

- Create a config map with your token

```yml
# configmap sysadmin_github_token
token: 78478r98ur98234unkdf98u4r89u
```

```py
from github import Github
gh = Github(base_url="https://github.ibm.com/api/v3", login_or_token=sysadmin_github_token["token"])

repo = gh.get_repo("CIO-SETS/bizops")
raw_content = repo.get_contents('postman/IBI/BI PROD UT - FLM.postman_environment.json')
content = raw_content.decoded_content.decode()

# for diem
out(content)
```

## Get Content of a folder

```py
contents = repo.get_contents("postman/IBI")
while len(contents) > 1:
    file_content = contents.pop(0)
    if file_content.type == 'dir':
        contents.extend(repo.get_contents(file_content.path))
    else:
        print(file_content.decoded_content.decode())
```

## Using Rest

```py
import pandas as pd
import requests
import io
import json

# Username of your GitHub account
username = 'guy-huinen'

# Personal Access Token (PAO) from your GitHub account
token = sysadmin_github_token["token"]

# Creates a re-usable session object with your creds in-built
github_session = requests.Session()
github_session.auth = (username, token)

# Downloading the csv file from your GitHub
url = "https://raw.github.ibm.com/CIO-SETS/bizops/developer/postman/IBI/BizOps%20Insights%20UT.postman_collection.json?token=AAACBI6CEQI54LFWNPPRILTAFLGQE"
# Make sure the url is the raw version of the file on GitHub

download = github_session.get(url).content
# Reading the downloaded content and making it a pandas dataframe

json = json.load(io.StringIO(download.decode('utf-8')))

# Printing out the first 5 rows of the dataframe to make sure everything is good
out(str(json))
```
