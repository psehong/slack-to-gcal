const RtmClient = require('@slack/client').RtmClient;

const createSlackClient = (token, logLevel) => {
  if (token && token.length > 0) {
    return new RtmClient(token, { logLevel: logLevel || 'info' });
  } else {
    throw new Error('Invalid token found');
  }
};

module.exports = { createSlackClient: createSlackClient };
