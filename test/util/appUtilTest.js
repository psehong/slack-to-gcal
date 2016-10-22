const _ = require('lodash');
const rewire = require('rewire');
const assert = require('chai').assert;

const appUtil = rewire('../../util/appUtil.js');


describe("appUtil", () => {
  describe("hasText", () => {
    it("Accepts messages with time", () => {
      assert.isTrue(appUtil.hasTime('Pick up the van at 8PM'));
    });
    it("Rejects messages with no time", () => {
      assert.isFalse(appUtil.hasTime('Pick up the van at 8'));
    });
  });
});
