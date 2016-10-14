const _ = require('lodash');
const google = require('googleapis');
const bunyan = require('bunyan');

const log = bunyan.createLogger({name: 'googleClient'});

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/calendar'];

const createJwtClient = (pathToKey, scopes) => {
  const key = require(pathToKey);
  return new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    scopes || DEFAULT_SCOPES,
    null
  );
};

const createGoogleClient = (jwtClient) => {
  return google.calendar({ version: 'v3', auth: jwtClient });
};

const quickAddEvent = (client, calendarId) => {
  return (quickAddText, onAdd) => {
    client.events.quickAdd({
      calendarId: calendarId,
      text: quickAddText
    }, (error, response) => {
      if (error) {
        log.error(`Could not quick add event: ${JSON.stringify(error)}`);
        onAdd({});
      } else {
        log.info(`Response: ${JSON.stringify(response)}`);
        onAdd(response);
      }
    });
  };
};

const setAttendingEvent = (client, calendarId, eventId, attendee) => {
  return (onUpdate) => {
    client.events.get({
      calendarId: calendarId,
      eventId: eventId
    }, (error, response) => {
      if (error) {
        log.error(`Could not get event from GCal: ${JSON.stringify(error)}`);
      } else {
        log.info(`Set attending GCal response: ${JSON.stringify(response)}`);
        const oldResource = Object.assign({ attendees: [] }, response);
        if (response.attendees) {
          oldResource.attendees = [...response.attendees, {
            id: attendee.id,
            email: attendee.email,
            displayName: attendee.displayName
          }];
        } else {
          oldResource.attendees.push({
            id: attendee.id,
            email: attendee.email,
            displayName: attendee.displayName
          });
        }
        client.events.update({
          calendarId: calendarId,
          eventId: eventId,
          resource: oldResource
        }, (error, response) => {
          if (error) {
            log.error(`Could not add attendee to event: ${JSON.stringify(error)}`);
          } else {
            log.info(`Successfully added attendee, GCal response: ${JSON.stringify(response)}`);
            onUpdate(response);
          }
        });
      }
    });
  };
};

const setNotAttendingEvent = (client, calendarId, eventId, attendee) => {
  return (onUpdate) => {
    client.events.get({
      calendarId: calendarId,
      eventId: eventId
    }, (error, response) => {
      if (error) {
        log.error(`Could not get event from GCal: ${JSON.stringify(error)}`);
      } else {
        log.info(`Removing attendee GCal response: ${JSON.stringify(response)}`);
        if (response.attendees) {
          const updatedEvent = _.assign(Object.assign({}, response), {
            attendees: _.filter(response.attendees, (attendee) => attendee.email !== attendee.email)
          });
          client.events.update({
            calendarId: calendarId,
            eventId: eventId,
            resource: updatedEvent
          }, (error, response) => {
            if (error) {
              log.error(`Could not remove attendee: ${JSON.stringify(error)}`);
            } else {
              log.info(`Successfully removed attendee, GCal response: ${JSON.stringify(response)}`);
              onUpdate(response);
            }
          });
        }
      }
    });
  };
};

module.exports = {
  createJwtClient: createJwtClient,
  createGoogleClient: createGoogleClient,
  quickAddEvent: quickAddEvent,
  setAttendingEvent: setAttendingEvent,
  setNotAttendingEvent: setNotAttendingEvent
};
