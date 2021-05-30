<!-- markdownlint-disable MD033 -->
# Parameters for Slack -slack

> This describes the usuage of the parameters section in your job. For more details see the respective section.

## Custom Webhook

Add your api key in the webhook section and reference it with the selector

```yml
# API Key (Pipelines and Jobs)
# You can use your own api key to post to your prefered channel
# Select the status you would like to have posted to slack
slack:
    webhook: slackbizops
    channel: bizopscustomslack
    username: API Reporting Manager
    status:
        - Failed
        - Submitted
```

For "username" the environment is appended to the subject

```html
Api Reporting Manager on test
```

## Disabling Slack

```yml
# Disable using the disabled boolean value
slack:
    disabled: true
    enabled: false
```

## Event Messages

Only report specific status codes in slack

```yml
status:
    - Failed
    - Submitted
```
