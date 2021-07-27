# Slack-Bot Integration

> Connect Diem to Slack via a bot

![config1](../../../diem-help/docs/images/external_integrations/slackbot.png)

## What you need

The Diem slackbot up and running
A slack bot api token
A Diem JWT Token ( Create one it from integrations jwt)

Make sure your bot has access to your channel

## Examples

### Messages

#### using your slack webhook

```py
import requests
slackhook = "yourslackwebhook"

slack_msg = {
    "channel": "#diem-bugs-guy",
    "icon_emoji": ":diem:",
    "username": "diem - UAT",
    "text": ":ok: DIEM: Daily Log Cleanup",
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": ":ok: DIEM: Daily Log Cleanup"
        }
      },
      {
        "type": "divider"
      }
    ],
    "attachments": [
      {
         "color": "#2eb886",
        "blocks": [
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Total Documents in Log:*"
              },
              {
                "type": "mrkdwn",
                "text": "21282882"
              },
              {
                "type": "mrkdwn",
                "text": "*Total Documents removed from Log:*"
              },
              {
                "type": "mrkdwn",
                "text": "21282882"
              }
            ]
          },
          {
              "type": "context",
              "elements": [
                {
                  "type": "plain_text",
                  "text": "Diem on UAT - diem-core@1.0.6 - v16.1.0",
                  "emoji": True
                }
              ]
            }
        ]
      }
    ]
  }

r = requests.post(slackhook, data=json.dumps(slack_msg))
t.text
```

#### Using a bot

```py
import requests
import json

token = "your slack bot token"
headers = { f"Authorization": f"Bearer {token}"}

apiUrl = 'https://slack.com/api/'

slack_msg = {
    "channel": "#diem-bugs-guy",
    "icon_emoji": ":diem:",
    "username": "diem - UAT",
    "text": ":ok: DIEM: Daily Log Cleanup",
    "blocks": json.dumps([
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": ":info: DIEM: Daily Log Cleanup"
        }
      },
      {
        "type": "divider"
      }
    ]),
    "attachments": json.dumps([
      {
         "color": "#2eb886",
        "blocks": [
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Total Documents in Log:*"
              },
              {
                "type": "mrkdwn",
                "text": "21282882"
              },
              {
                "type": "mrkdwn",
                "text": "*Total Documents removed from Log:*"
              },
              {
                "type": "mrkdwn",
                "text": "21282882"
              }
            ]
          },
          {
              "type": "context",
              "elements": [
                {
                  "type": "plain_text",
                  "text": "Diem on UAT - diem-core@1.0.6 - v16.1.0",
                  "emoji": True
                }
              ]
            }
        ]
      }
    ])
  }

r = requests.post(f"{apiUrl}/chat.postMessage", slack_msg, headers= headers)
```

### Files

#### Send a pandas dataframe as csv to slack

```py
import io
import pandas as pd

token = "your slack bot token"
headers = { f"Authorization": f"Bearer {token}"}

apiUrl = 'https://slack.com/api/'

df = pd.DataFrame({'name': ['Raphael', 'Donatello'],
                   'mask': ['red', 'purple'],
                   'weapon': ['sai', 'bo staff']})
csv = df.to_csv(index=False)

my_file = {
  'file' : io.StringIO(csv)
}

filename = "sample.csv"

payload={
    "filename": filename,
    "channels":'channelid', # or '#youchannel'
    "title": filename,
    "initial_comment":'sampletext',
}

r = requests.post(f"{apiUrl}/files.upload", params=payload, files=my_file, headers= headers)

```

#### Upload an existing file

```py
f = open('joblog.csv', 'rb')
my_file = {
  'file' : io.BytesIO(f.read())
}
```

#### Sending a plot as png to slack

> uses a temporaty safe or directly via the buffer

```py
import pandas as pd
import matplotlib.pyplot as plt
from io import BytesIO,StringIO
import base64

data = {'Country': ['USA','Canada','Germany','UK','France'],
        'GDP_Per_Capita': [45000,42000,52000,49000,47000]
       }

plt.figure()
df = pd.DataFrame(data,columns=['Country','GDP_Per_Capita'])
df.plot(x ='Country', y='GDP_Per_Capita', kind = 'bar')
buf = BytesIO()

# save the file to a memory buffer
plt.savefig(buf, format="png",transparent=True, bbox_inches='tight',dpi=100)

# save the file to disk
plt.savefig('metrics.png', format="png",transparent=True, bbox_inches='tight',dpi=100)

# load the file and sent it

file_name = 'metrics-file.png'
f = open('test.png', 'rb')

file_data = {
  'file' :  io.BytesIO(f.read())
}

payload={
    "mimetype":"image/png",
    "filetype":"png",
    "channels":'#diem-bot-uat',
    "title":file_name,
    "initial_comment":'sample graph',
}

r = requests.post(f"{apiUrl}/files.upload", params=payload, files=file_data, headers= headers)

# use the buffer to sent it
file_name = 'metrics-memory.png'

file_data = {
  'file' :  buf.getvalue()
}

payload={
    "mimetype":"image/png",
    "filetype":"png",
    "channels":'#diem-bot-uat',
    "title":file_name,
    "initial_comment":'sample graph',
}

r = requests.post(f"{apiUrl}/files.upload", params=payload, files=file_data, headers= headers)
```
