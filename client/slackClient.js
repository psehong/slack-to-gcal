const RtmClient = require('@slack/client').RtmClient;

const createSlackClient = (token, logLevel) => {
  if (token && token.length > 0) {
    return new RtmClient(token, { logLevel: logLevel || 'info' });
  } else {
    throw new Error('Invalid token found');
  }
};

const isActionableReactionEvent = (slackMessage, activeUserId, reactionEmoji) => {
  return slackMessage
    && slackMessage.hasOwnProperty('user')
    && slackMessage.hasOwnProperty('item_user')
    && slackMessage.hasOwnProperty('reaction')
    && slackMessage.item_user === activeUserId
    && slackMessage.reaction === reactionEmoji;
};

module.exports = {
  createSlackClient: createSlackClient,
  isActionableReactionEvent: isActionableReactionEvent
};
