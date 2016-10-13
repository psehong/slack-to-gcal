const slackClient = require('./slackClient.js');
const googleClient = require('./googleClient.js');
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const bunyan = require('bunyan');

const log = bunyan.createLogger({name: 'GcalToSlack'});

const GOOGLE_PATH_TO_KEY = process.env.GOOGLE_PATH_TO_KEY || '';
const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN || '';
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || '';

const SLACK_BOT_ID = process.env.SLACK_BOT_ID || '';
const SLACK_AT_BOT =`<@${SLACK_BOT_ID}>`;

const onGcalEventAdd = (slackMessage, gcalResponse, gcalSlackClient) => {
  if (gcalResponse && gcalResponse.htmlLink) {
    gcalSlackClient.sendMessage(`Created event, edit or view here: ${gcalResponse.htmlLink}`, slackMessage.channel);
  } else {
    log.warn(`Failed to write GCal event for slackMessage: ${JSON.stringify(slackMessage)}
            and GCal response: ${JSON.stringify(gcalResponse)}`);
    gcalSlackClient.sendMessage("I couldn't create this event, sorry :(", slackMessage.channel);
  }
};

const initClients = () => {
  const gcalClient = googleClient.createGoogleClient(googleJwtClient);
  const addEvent = googleClient.quickAddEvent(gcalClient, CALENDAR_ID);
  const gcalSlackClient = slackClient.createSlackClient(SLACK_API_TOKEN, addEvent);
  gcalSlackClient.start();

  gcalSlackClient.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    log.info(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);
  });

  gcalSlackClient.on(RTM_EVENTS.MESSAGE, (slackMessage) => {
    if (slackMessage && slackMessage.text && slackMessage.text.includes(SLACK_AT_BOT)) {
      log.info(`Received Slack message ${JSON.stringify(slackMessage)}`);
      addEvent(slackMessage.text.split(SLACK_AT_BOT)[1].trim(), (gcalResponse) => {
        onGcalEventAdd(slackMessage, gcalResponse, gcalSlackClient);
      });
    }
  });
};

const googleJwtClient = googleClient.createJwtClient(GOOGLE_PATH_TO_KEY);
googleJwtClient.authorize((error, tokens) => {
  if (error) {
    throw new Error(`Could not authorize Google client with JWT, error: ${error}`);
  }
  log.info('Initialized Google JWT client, starting other clients');
  initClients();
});
