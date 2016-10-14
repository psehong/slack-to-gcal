const _ = require('lodash');
const assert = require('chai').assert;

const slackClient = require('../client/slackClient.js');

describe("slackClient", () => {
  describe("Is actionable reaction event", () => {
    it("Accepts valid user, item_user, and reaction", () => {
      const slackMessage = {
        user: {},
        item_user: 'id',
        reaction: 'reaction'
      };
      assert.isTrue(slackClient.isActionableReactionEvent(slackMessage, 'id', 'reaction'));
    });
    it("Rejects missing user", () => {
      const slackMessage = {
        item_user: 'id',
        reaction: 'reaction'
      };
      assert.isFalse(slackClient.isActionableReactionEvent(slackMessage, 'id', 'reaction'));
    });
    it("Rejects missing item_user", () => {
      const slackMessage = {
        user: {},
        reaction: 'reaction'
      };
      assert.isFalse(slackClient.isActionableReactionEvent(slackMessage, 'id', 'reaction'));
    });
    it("Rejects missing reaction", () => {
      const slackMessage = {
        user: {},
        item_user: 'id'
      };
      assert.isFalse(slackClient.isActionableReactionEvent(slackMessage, 'id', 'reaction'));
    });
    it("Rejects mismatched item_user", () => {
      const slackMessage = {
        user: {},
        item_user: 'not_a_id',
        reaction: 'reaction'
      };
      assert.isFalse(slackClient.isActionableReactionEvent(slackMessage, 'id', 'reaction'));
    });
    it("Rejects mismatched reaction", () => {
      const slackMessage = {
        user: {},
        item_user: 'id',
        reaction: 'not_a_reaction'
      };
      assert.isFalse(slackClient.isActionableReactionEvent(slackMessage, 'id', 'reaction'));
    });
  });
});
