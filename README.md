# slack-to-gcal [![CircleCI](https://circleci.com/gh/psehong/slack-to-gcal.svg?style=svg)](https://circleci.com/gh/psehong/slack-to-gcal)

`slack-to-gcal` is a Slack bot that runs in a `node` app, and allows interaction with Google Calendar through `@` mention commands.

Intended as a way to use the companion Slack official Google Calendar notification integration to quick add events to (via this bot) and receive notifications from (via Slack's official integration) a shared Google Calendar.

## Slack Commands

### `\@{bot_nick} today`
Bot will list, as Slack attachments, all events for the current day. Currently set for EDT, but can be generalized if needed.

### `\@{bot_nick} {tmrw, tomorrow}`
Bot will list, as Slack attachments, all events for the next day. Currently set for EDT, but can be generalized if needed.

### `\@{bot_nick} all`
Bot will list, as Slack attachments, all upcoming events. Currently set for EDT, but can be generalized if needed.

### `\@{bot_nick} {Google Calendar quick add text}`
The bot will parse all other `@` mention text as a Google Calendar [Quick Add](https://support.google.com/calendar/answer/72143?co=GENIE.Platform%3DDesktop&hl=en) entry.

Bot currently requires a meridiem be supplied (e.g., `3PM` instead of `3`). Timezone will be determined by the calendar's default timezone.

## Running
This uses a Google Service Account for permissions to a shared Google Calendar, and a Slack API key for bot access.

### Google Service Account
Note: This has only been tested with a personal Google Account, there may be other factors to consider if you run other Google Cloud Platform apps or Google Apps accounts.

1. Create a Google Cloud Platform project [here](https://console.cloud.google.com/home/dashboard)
  * Go to `My Project`, then `Create Project`
2. Create a Google Service Account [here](https://console.developers.google.com/permissions/serviceaccounts)
  * When prompted, select the project you created
  * Create a new service account
  * Select role as `Project account owner`
  * Enable `Furnish a new private key`
  * Enable `Enable G Suite Domain-wide Delegation`
3. Store the key in a safe place where the app can access via file path
4. Create a calendar from your personal account, and share it with the Google Service Account
  * To share the calendar via email, use the address under `Service account ID` for the desired service account in the Google Service Account page
5. In Google Calendar, note the `Calendar ID` found in the calendar's settings, under `Calendar Address`
6. In `init.sh`, set `GOOGLE_CALENDAR_ID` to the `Calendar ID`, and `GOOGLE_PATH_TO_KEY` to the service account key downloaded from above

### Slack
1. Acquire a Slack API key
2. Find the Slack bot's ID, see [here](https://api.slack.com/bot-users)
3. In `init.sh`, set `SLACK_API_TOKEN` and `SLACK_BOT_ID`

### Setting the env
1. Validate the above env settings in `init.sh`
2. If desired, set the IDs of reaction emoji (e.g., `x` or `white_check_mark`) for attending / not attending RSVPs

### Finally
Run `init.sh`
Logging set to log to `stdout` and a log file in the root directory

## License
MIT