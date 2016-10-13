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
    && slackMessage.user
    && slackMessage.item_user === activeUserId
    && slackMessage.reaction === reactionEmoji;
};

module.exports = {
  createSlackClient: createSlackClient,
  isActionableReactionEvent: isActionableReactionEvent
};
