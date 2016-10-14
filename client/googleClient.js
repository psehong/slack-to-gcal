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

const updateAttendees = (gcalEvent, attendeesToAdd, attendeesToRemove) => {
  let gcalEventCopy = Object.assign({}, gcalEvent);
  if (attendeesToAdd.length > 0) {
    if (gcalEvent.attendees) {
      gcalEventCopy = _.assign(gcalEventCopy, { attendees: [...gcalEvent.attendees, ...attendeesToAdd] });
    } else {
      gcalEventCopy = _.assign(gcalEventCopy, { attendees: attendeesToAdd });
    }
  }
  if (attendeesToRemove.length > 0) {
    if (gcalEvent.attendees) {
      const attendeeToRemoveEmails = new Set(_.map(attendeesToRemove, (attendee) => attendee.email));
      gcalEventCopy = _.assign(gcalEventCopy, {
        attendees: _.filter(gcalEvent.attendees, (oldAttendee) => !attendeeToRemoveEmails.has(oldAttendee))
      });
    }
  }
  return gcalEventCopy;
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
        client.events.update({
          calendarId: calendarId,
          eventId: eventId,
          resource: updateAttendees(response, [attendee], [])
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
          client.events.update({
            calendarId: calendarId,
            eventId: eventId,
            resource: updateAttendees(response, [], [attendee])
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
