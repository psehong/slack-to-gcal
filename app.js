const _ = require('lodash');
const moment = require('moment-timezone');
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const WebClient = require('@slack/client').WebClient;
const bunyan = require('bunyan');

const slackClient = require('./client/slackClient.js');
const googleClient = require('./client/googleClient.js');
const appUtil = require('./util/appUtil.js');

const log = bunyan.createLogger({
  name: 'SlackToGcal',
  streams: [{
      level: 'info',
      stream: process.stdout
    }, {
      level: 'info',
      path: 'slack-to-gcal-info.log'
    }
  ]
});

const GOOGLE_PATH_TO_KEY = process.env.GOOGLE_PATH_TO_KEY;
const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const SLACK_BOT_ID = process.env.SLACK_BOT_ID;

const SLACK_AT_BOT =`<@${SLACK_BOT_ID}>`;
const SLACK_ATTENDING_REACTION = process.env.SLACK_ATTENDING_REACTION || 'white_check_mark';
const SLACK_NOT_ATTENDING_REACTION = process.env.SLACK_NOT_ATTENDING_REACTION || 'x';

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
    log.info(`Created GCal event with response: ${JSON.stringify(gcalResponse)}`);
    gcalSlackClient.sendMessage(
      `*Event Title: ${gcalResponse.summary}*` +
      `\n\nCreated event, edit or view here: ${gcalResponse.htmlLink}` +
      `\nReact with :white_check_mark: to RSVP *yes*!` +
      `\nReact with :x: or remove your :white_check_mark: reaction to RSVP *no*!` +
      `\nEvent ID: ${gcalResponse.id}`,
      slackMessage.channel);
  } else {
    log.warn(`Failed to write GCal event for slackMessage: ${JSON.stringify(slackMessage)}` +
      `and GCal response: ${JSON.stringify(gcalResponse)}`);
    gcalSlackClient.sendMessage("I couldn't create this event, sorry :(", slackMessage.channel);
  }
};

const listGcalEvents = (getEvent, start, end, slackWebClient, channelId) => {
  if (getEvent && slackWebClient) {
    log.info(`Listing GCal events for calendarId: ${CALENDAR_ID}`);
    getEvent(CALENDAR_ID, start, end, (response) => {
      log.info(`Events: ${JSON.stringify(response)}`);
      if (response && response.items && response.items.length > 0) {
        slackWebClient.chat.postMessage(channelId, appUtil.gcalEventPhrase(response), {
          as_user: true,
          attachments: _(response.items).sortBy(appUtil.gcalSort).map(appUtil.gcalEventToSlackEvent).value()
        });
      } else {
        slackWebClient.chat.postMessage(channelId, "There are no upcoming events", { as_user: true });
      }
    });
  } else {
    log.error(`Missing a client, getEvent: ${getEvent},slackWebClient: ${slackWebClient}`);
  }
};

const findReactionMessage = (slackWebClient, gcalSlackClient, slackMessage, onReactionMessageFound) => {
  log.info(`Receives Slack reaction added ${JSON.stringify(slackMessage)}`);
  const reactionUser = gcalSlackClient.dataStore.getUserById(slackMessage.user);
  if (reactionUser && reactionUser.profile.email) {
    log.info(`Found reaction user: ${JSON.stringify(reactionUser)}`);
    slackWebClient.channels.history(slackMessage.item.channel, {
      channel: slackMessage.item.channel,
      latest: slackMessage.item.ts,
      count: 1,
      inclusive: 1
    }, (error, response) => {
      log.info(`Message found for event ID: ${JSON.stringify(response)}`);
      onReactionMessageFound(reactionUser, response);
    });
  } else {
    log.error(`Failed to get reactionUser or reactionUser.profile.email for reaction added event and Slack message: ` +
      `${JSON.stringify(slackMessage)}`);
  }
};

const setAttending = (gcalClient, slackWebClient, gcalSlackClient, slackMessage) => {
  findReactionMessage(slackWebClient, gcalSlackClient, slackMessage, (reactionUser, response) => {
    googleClient.setAttendingEvent(
      gcalClient,
      CALENDAR_ID,
      appUtil.getEventIdFromSlackMsg(response.messages[0].text), {
        id: reactionUser.id,
        email: reactionUser.profile.email,
        displayName: reactionUser.profile.real_name,
        responseStatus: 'accepted'
      })(() => {});
  });
};

const setNotAttending = (gcalClient, slackWebClient, gcalSlackClient, slackMessage) => {
  findReactionMessage(slackWebClient, gcalSlackClient, slackMessage, (reactionUser, response) => {
    googleClient.setNotAttendingEvent(
      gcalClient,
      CALENDAR_ID,
      appUtil.getEventIdFromSlackMsg(response.messages[0].text), {
        id: reactionUser.id,
        email: reactionUser.profile.email,
        displayName: reactionUser.profile.real_name,
        responseStatus: 'declined'
      })(() => {});
  });
};

const initClients = () => {
  const gcalClient = googleClient.createGoogleClient(googleJwtClient);
  const addEvent = googleClient.quickAddEvent(gcalClient, CALENDAR_ID);
  const getEvent = googleClient.getEvent(gcalClient);
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
    } else if (slackClient.isActionableReactionEvent(slackMessage, gcalSlackClient.activeUserId, SLACK_NOT_ATTENDING_REACTION)) {
      setNotAttending(gcalClient, slackWebClient, gcalSlackClient, slackMessage);
    }
  });

  gcalSlackClient.on(RTM_EVENTS.REACTION_REMOVED, (slackMessage) => {
    if (slackClient.isActionableReactionEvent(slackMessage, gcalSlackClient.activeUserId, SLACK_ATTENDING_REACTION)) {
      setNotAttending(gcalClient, slackWebClient, gcalSlackClient, slackMessage);
    }
  });

  gcalSlackClient.on(RTM_EVENTS.MESSAGE, (slackMessage) => {
    if (slackMessage && slackMessage.text && slackMessage.text.includes(SLACK_AT_BOT)) {
      log.info(`Received Slack message ${JSON.stringify(slackMessage)}`);
      if (slackMessage.text.split(SLACK_AT_BOT)[1].trim().toLowerCase() === 'today') {
        const range = appUtil.gcalTodayRange(googleClient.GCAL_DATE_FORMAT);
        log.info(`Query, start: ${range.start}, end: ${range.end}`);
        listGcalEvents(getEvent, range.start, range.end, slackWebClient, slackMessage.channel);
      } else if (slackMessage.text.split(SLACK_AT_BOT)[1].trim().toLowerCase() === 'all') {
        const range = appUtil.gcalUpcomingRange(googleClient.GCAL_DATE_FORMAT);
        log.info(`Query, start: ${range.start}, end: ${range.end}`);
        listGcalEvents(getEvent, range.start, range.end, slackWebClient, slackMessage.channel);
      } else if (slackMessage.text.split(SLACK_AT_BOT)[1].trim().toLowerCase() === 'tmrw' ||
          slackMessage.text.split(SLACK_AT_BOT)[1].trim().toLowerCase() === 'tomorrow') {
        const range = appUtil.gcalTmrwRange(googleClient.GCAL_DATE_FORMAT);
        log.info(`Query, start: ${range.start}, end: ${range.end}`);
        listGcalEvents(getEvent, range.start, range.end, slackWebClient, slackMessage.channel);
      } else {
        if (appUtil.hasTime(slackMessage.text)) {
          log.info(`SlackMessage found to have time: ${slackMessage.text}`);
          addEvent(slackMessage.text.split(SLACK_AT_BOT)[1].trim(), (gcalResponse) => {
            onGcalEventAdd(slackMessage, gcalResponse, gcalSlackClient);
          });
        } else {
          log.info(`SlackMessage not found to have time: ${slackMessage.text}`);
          gcalSlackClient.sendMessage(
            `It looks like your message doesn't have a time! Please add a time, including the meridiem, e.g.:`+
            `\n\`3AM today, 4 PM tomorrow, 8:30PM to 9:30PM on 8/31, 9PM for 30 minutes on 9/2\``,
            slackMessage.channel);
        }
      }
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
