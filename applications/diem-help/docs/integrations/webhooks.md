# Webhooks

> Webhooks can be used for all sorts of integrations and callbacks

## Example

## Using in Slack

```yml
# API Key (Pipelines and Jobs)
# You can use your own api key to post to your prefered channel
# Add your api key in the webhook section and reference it with the selector
# Select the status you would like to have posted to slack
slack:
    webhook: slackbizops
    status:
        - Failed
        - Submitted
```
