# Webhooks

> Webhooks can be used for all sorts of integrations and callbacks

## Example

### Using in Slack

Add the slack parameter to the parameters in the job. Add the reference to the webhook and optionaly specify the status.

All jobs statuses meeting these criteria will be sent to your custom slack channel.

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
