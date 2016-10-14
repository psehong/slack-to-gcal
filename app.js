const _ = require('lodash');
const slackClient = require('./client/slackClient.js');
const googleClient = require('./client/googleClient.js');
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const WebClient = require('@slack/client').WebClient;
const bunyan = require('bunyan');

const log = bunyan.createLogger({name: 'SlackToGcal'});

const GOOGLE_PATH_TO_KEY = process.env.GOOGLE_PATH_TO_KEY;
const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const SLACK_BOT_ID = process.env.SLACK_BOT_ID;

const SLACK_AT_BOT =`<@${SLACK_BOT_ID}>`;
const SLACK_ATTENDING_REACTION = process.env.SLACK_ATTENDING_REACTION || 'white_check_mark';
const SLACK_NOT_ATTENDING_REACTION = process.env.SLACK_NOT_ATTENDING_REACTION || 'white_check_mark';

if (_.some([
    GOOGLE_PATH_TO_KEY,
    SLACK_API_TOKEN,
    CALENDAR_ID,
    SLACK_BOT_ID
  ], (env) => !env)) {
  log.error(`Cannot have missing env vars:
    GOOGLE_PATH_TO_KEY: ${GOOGLE_PATH_TO_KEY},
    SLACK_API_TOKEN: ${SLACK_API_TOKEN},
    GOOGLE_CALENDAR_ID: ${CALENDAR_ID},
    SLACK_BOT_ID: ${SLACK_BOT_ID}
  `);
  throw new Error("Startup failed validation, missing required env vars");
}

const onGcalEventAdd = (slackMessage, gcalResponse, gcalSlackClient) => {
  if (gcalResponse && gcalResponse.htmlLink) {
    gcalSlackClient.sendMessage(`Created event, edit or view here: ${gcalResponse.htmlLink}`
      + `\nReact to this message with :white_check_mark: to RSVP yes, remove the reaction to RSVP no!`
      + `\nEvent ID: ${gcalResponse.id}`,
      slackMessage.channel);
  } else {
    log.warn(`Failed to write GCal event for slackMessage: ${JSON.stringify(slackMessage)}`
      + `and GCal response: ${JSON.stringify(gcalResponse)}`);
    gcalSlackClient.sendMessage("I couldn't create this event, sorry :(", slackMessage.channel);
  }
};

const findReactionMessage = (slackWebClient, gcalSlackClient, slackMessage, onReactionMessageFound) => {
  log.info(`Receives Slack reaction added ${JSON.stringify(slackMessage)}`);
  const reactionUser = gcalSlackClient.dataStore.getUserById(slackMessage.user);
  if (reactionUser && reactionUser.email) {
    log.info(`Found reaction user: ${JSON.stringify(reactionUser)}`);
    slackWebClient.groups.history(slackMessage.item.channel, {
      channel: slackMessage.item.channel,
      latest: slackMessage.item.ts,
      count: 1,
      inclusive: 1
    }, (error, response) => {
      log.info(`Message found for event ID: ${JSON.stringify(response)}`);
      onReactionMessageFound(reactionUser, response);
    });
  } else if (!reactionUser.email) {
    log.error(`reationUser must have an email address, message: ${JSON.stringify(slackMessage)}`);
  } else {
    log.error(`Failed to get reactionUser for reaction added event and Slack message: ${JSON.stringify(slackMessage)}`);
  }
};

const setAttending = (gcalClient, slackWebClient, gcalSlackClient, slackMessage) => {
  findReactionMessage(slackWebClient, gcalSlackClient, slackMessage, (reactionUser, response) => {
    googleClient.setAttendingEvent(
      gcalClient,
      CALENDAR_ID,
      response.messages[0].text.split('Event ID: ')[1].split(',')[0], {
        id: reactionUser.id,
        email: reactionUser.profile.email,
        displayName: reactionUser.real_name
      })(() => {});
  });
};

const setNotAttending = (gcalClient, slackWebClient, gcalSlackClient, slackMessage) => {
  findReactionMessage(slackWebClient, gcalSlackClient, slackMessage, (reactionUser, response) => {
    googleClient.setNotAttendingEvent(
      gcalClient,
      CALENDAR_ID,
      response.messages[0].text.split('Event ID: ')[1].split(',')[0], {
        id: reactionUser.id,
        email: reactionUser.profile.email,
        displayName: reactionUser.real_name
      })(() => {});
  });
};

const initClients = () => {
  const gcalClient = googleClient.createGoogleClient(googleJwtClient);
  const addEvent = googleClient.quickAddEvent(gcalClient, CALENDAR_ID);
  const gcalSlackClient = slackClient.createSlackClient(SLACK_API_TOKEN, addEvent);
  // Need as some methods not available in the rtm client
  const slackWebClient = new WebClient(SLACK_API_TOKEN);
  gcalSlackClient.start();

  gcalSlackClient.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    log.info(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);
  });

  gcalSlackClient.on(RTM_EVENTS.REACTION_ADDED, (slackMessage) => {
    if (slackClient.isActionableReactionEvent(slackMessage, gcalSlackClient.activeUserId, SLACK_ATTENDING_REACTION)) {
      setAttending(gcalClient, slackWebClient, gcalSlackClient, slackMessage);
    }
  });

  gcalSlackClient.on(RTM_EVENTS.REACTION_REMOVED, (slackMessage) => {
    if (slackClient.isActionableReactionEvent(
        slackMessage,
        gcalSlackClient.activeUserId,
        SLACK_NOT_ATTENDING_REACTION)) {
      setNotAttending(gcalClient, slackWebClient, gcalSlackClient, slackMessage);
    }
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
