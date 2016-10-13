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

module.exports = {
  createJwtClient: createJwtClient,
  createGoogleClient: createGoogleClient,
  quickAddEvent: quickAddEvent
};
